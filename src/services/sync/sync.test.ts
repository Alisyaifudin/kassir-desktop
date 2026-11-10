/**
 * The v2 sync, end to end against a fake server that follows the same contract
 * the real one does (`SYNC-V2.md`).
 *
 * The fake server assigns `seq` on every applied change, keeps a change log per
 * group, and answers `applied`/`noop`/`stale` by the §4.3/§5 rules — so a test
 * asserts the *outcome* (what both sides end up holding) instead of the calls
 * made. The client's SQL runs against a real SQLite (`makeTestDatabase`), so a
 * statement that would not run in the app fails here.
 */
import { describe, expect, test } from "bun:test";
import { Context, Effect, Fiber, Layer, Option, PubSub, Stream } from "effect";
import { makeTestDatabase } from "../db/test-support";
import { CustomerService } from "../customer";
import { CustomerLive } from "../customer/live";
import { CategoryLive } from "../category/live";
import { ComboLive } from "../combo/live";
import { ExtraLive } from "../extra/live";
import { MethodLive } from "../method/live";
import { MoneyLive } from "../money/live";
import { ProductLive } from "../product/live";
import { RecordLive } from "../record/live";
import { SocialLive } from "../social/live";
import { makeTestStore } from "../store/test-support";
import { SupplierLive } from "../supplier/live";
import {
  SYNC_GROUPS,
  SyncService,
  type AutoSyncState,
  type SyncGroup,
  type SyncReport,
  type SyncState,
} from ".";
import { SyncLive } from "./live";
import { decide, decideAggregate, sameAggregate } from "./merge";
import { parsePullFrame } from "./frames";
import {
  GROUPS,
  TABLES,
  emptyChildren,
  groupOf,
  idOf,
  type WireChildren,
  type WireRow,
} from "./schema";
import { SyncTransportService, TransportError, type SyncTransport } from "./transport";
import { SyncTriggerService, triggerOf } from "./trigger";
import type { LineStream } from "./stream";

// ============================================================================
// A server that behaves like the contract says it must (§3.2, §4.3, §4.4)
// ============================================================================

type Change = { seq: number; entity: string; row: WireRow; children?: WireChildren };

class FakeServer {
  counter = 0;
  readonly changes: Change[] = [];
  readonly rows = new Map<string, WireRow>();
  readonly children = new Map<string, WireChildren>();
  /** Every pull the client asked for, so a test can assert the cursor it used. */
  readonly pulls: { group: string; after: number }[] = [];
  /** Set to answer a pull with `410 too_old` and this floor. */
  floor: number | null = null;

  private key(entity: string, id: string): string {
    return `${entity}:${id}`;
  }

  private store(change: Omit<Change, "seq">): number {
    this.counter += 1;
    this.rows.set(this.key(change.entity, idOf(TABLES[change.entity]!, change.row)), change.row);
    if (TABLES[change.entity]!.kind === "aggregate" && change.children !== undefined) {
      this.children.set(idOf(TABLES[change.entity]!, change.row), change.children);
    }
    this.changes.push({ ...change, seq: this.counter });
    return this.counter;
  }

  /** The seq of the current version of a row/aggregate, as an ack must report it. */
  private seqOf(entity: string, id: string): number {
    for (let index = this.changes.length - 1; index >= 0; index -= 1) {
      const change = this.changes[index];
      if (change === undefined) continue;
      if (change.entity === entity && idOf(TABLES[entity]!, change.row) === id) return change.seq;
    }
    return 0;
  }

  /** §4.3: per-kind decisions, exactly one log entry per `applied` frame. */
  private apply(
    entity: string,
    row: WireRow,
    ch?: WireChildren,
  ): { s: string; seq: number; row?: WireRow; ch?: WireChildren } {
    const def = TABLES[entity];
    if (def === undefined) throw new Error(`unknown entity ${entity}`);
    const id = idOf(def, row);
    const stored = this.rows.get(this.key(entity, id));

    if (stored === undefined) {
      return { s: "applied", seq: this.store({ entity, row, ...(ch ? { children: ch } : {}) }) };
    }

    if (def.kind === "append") return { s: "noop", seq: this.seqOf(entity, id) };

    if (def.kind === "aggregate") {
      const group = def.group;
      const children = GROUPS[group].children;
      if (children === undefined) throw new Error(`${group} has no children`);
      const storedChildren = this.children.get(id) ?? emptyChildren(group);
      const decision = decideAggregate(
        def,
        children,
        stored,
        storedChildren,
        row,
        ch ?? emptyChildren(group),
      );
      if (decision === "noop") return { s: "noop", seq: this.seqOf(entity, id) };
      if (decision === "stale") {
        return { s: "stale", seq: this.seqOf(entity, id), row: stored, ch: storedChildren };
      }
      return {
        s: "applied",
        seq: this.store({ entity, row, children: ch ?? emptyChildren(group) }),
      };
    }

    const decision = decide(def, stored, row);
    if (decision === "noop") return { s: "noop", seq: this.seqOf(entity, id) };
    if (decision === "stale") return { s: "stale", seq: this.seqOf(entity, id), row: stored };
    // `money` takes only the note, the tombstone and the newer clock; the rest is
    // immutable. Without the clock the row would look unedited and every later
    // client would judge the note stale.
    const next: WireRow =
      def.kind === "money"
        ? {
            ...stored,
            money_note: row["money_note"],
            money_deleted_at: row["money_deleted_at"],
            money_updated_at: row["money_updated_at"],
          }
        : row;
    return { s: "applied", seq: this.store({ entity, row: next }) };
  }

  /** §4.4 ack catalog: one ack per frame, in order, then `done`. */
  push(body: string): string[] {
    const lines = body.split("\n").filter((line) => line !== "");
    const out: string[] = [];
    lines.forEach((line, index) => {
      const frame = JSON.parse(line) as { e: string; r: WireRow; ch?: WireChildren };
      const outcome = this.apply(frame.e, frame.r, frame.ch);
      out.push(
        JSON.stringify({
          t: "ack",
          i: index,
          e: frame.e,
          s: outcome.s,
          seq: outcome.seq,
          ...(outcome.row === undefined ? {} : { row: outcome.row }),
          ...(outcome.ch === undefined ? {} : { ch: outcome.ch }),
        }),
      );
    });
    out.push(JSON.stringify({ t: "done", frames: lines.length }));
    return out;
  }

  /**
   * The scoped snapshot of the one-product manual sync
   * (`SYNC-V2-ONE-PRODUCT.md` §2), as a single page. Small fake products never
   * need more than one page; the server suite owns the cursor boundary cases.
   */
  productPull(productId: string): string[] {
    // `PRODUCT_ONE_ENTITIES` order: `product_category` is appended, and `category`
    // is not here at all (it has no `product_id`, so the filter would drop it).
    const order = [
      "product",
      "product_name",
      "property",
      "listing",
      "image",
      "product_event",
      "product_category",
    ];
    const rows = [...this.rows.entries()]
      .filter(([, row]) => String(row["product_id"]) === productId)
      .map(([key, row]) => {
        const entity = key.slice(0, key.indexOf(":"));
        return { entity, row, seq: this.seqOf(entity, String(row[TABLES[entity]!.pk])) };
      })
      .sort((left, right) => {
        const byEntity = order.indexOf(left.entity) - order.indexOf(right.entity);
        if (byEntity !== 0) return byEntity;
        return String(left.row[TABLES[left.entity]!.pk]).localeCompare(
          String(right.row[TABLES[right.entity]!.pk]),
        );
      });
    const last = rows.length > 0 ? rows[rows.length - 1]!.seq : 0;
    return [
      JSON.stringify({ t: "meta", snapshot: this.counter, product_id: productId }),
      ...rows.map((entry) =>
        JSON.stringify({ t: "row", s: entry.seq, e: entry.entity, r: entry.row }),
      ),
      JSON.stringify({ t: "done", s: last, more: false, cursor: null }),
    ];
  }

  /** §3.2 plus the one-product scope rule: every frame must be in scope. */
  productPush(productId: string, body: string): string[] {
    const lines = body.split("\n").filter((line) => line !== "");
    lines.forEach((line, index) => {
      const frame = JSON.parse(line) as { e: string; r: WireRow };
      if (String(frame.r["product_id"]) !== productId) {
        throw new TransportError(
          400,
          "bad_frame",
          `frame ${index}: product_id is not the scoped product`,
        );
      }
    });
    return this.push(body);
  }

  /**
   * §3.2: `meta`, the group's changes in `(after, snapshot]`, then `done`.
   *
   * `count` is answered only when the caller asked for it, like the real route:
   * it is this group's own backlog, which is the only figure that can size a
   * pull — `snapshot` is the counter every group shares.
   */
  pull(group: string, after: number, limit: number, count = false): string[] {
    this.pulls.push({ group, after });
    if (this.floor !== null && after < this.floor) {
      throw new TransportError(410, "too_old", "bookmark below the floor", this.floor);
    }
    if (after > this.counter) {
      throw new TransportError(400, "bad_request", "bookmark ahead of the server");
    }
    const snapshot = this.counter;
    const ofGroup = this.changes.filter(
      (change) => change.seq > after && groupOf(change.entity) === group,
    );
    const page = ofGroup.slice(0, limit);
    const last = page.length > 0 ? page[page.length - 1]!.seq : after;
    const more = ofGroup.some((change) => change.seq > last);
    const remaining = ofGroup.length;
    return [
      JSON.stringify(count ? { t: "meta", snapshot, count: remaining } : { t: "meta", snapshot }),
      ...page.map((change) => {
        const def = TABLES[change.entity];
        return def?.kind === "aggregate"
          ? JSON.stringify({
              t: "ag",
              s: change.seq,
              e: change.entity,
              r: change.row,
              ch: change.children ?? emptyChildren(def.group),
            })
          : JSON.stringify({ t: "row", s: change.seq, e: change.entity, r: change.row });
      }),
      JSON.stringify({ t: "done", s: last, more }),
    ];
  }
}

// ============================================================================
// Harness
// ============================================================================

function lineStream(lines: readonly string[]): LineStream {
  return {
    requestId: "test",
    head: null,
    lines: (async function* () {
      for (const line of lines) yield line;
    })(),
    summary: Promise.resolve({ lines: lines.length, cancelled: false }),
    cancel: () => undefined,
  };
}

function failedStream(error: unknown): LineStream {
  return {
    requestId: "test",
    head: null,
    lines: (async function* () {
      // A failed request sends no line at all.
    })(),
    summary: Promise.reject(error),
    cancel: () => undefined,
  };
}

/** A deterministic stand-in for a content digest, per `(image, version)`. */
function shaOf(imageId: string, version: number): string {
  return `${imageId}-${version}`.padEnd(64, "0").slice(0, 64);
}

/** Every synced table, children before parents, so a fresh test starts empty. */
const TRUNCATE = [
  "DELETE FROM combo_discounts",
  "DELETE FROM combo_extras",
  "DELETE FROM combo_listings",
  "DELETE FROM combos",
  "DELETE FROM discounts",
  "DELETE FROM record_listings",
  "DELETE FROM record_methods",
  "DELETE FROM record_extras",
  "DELETE FROM record_images",
  "DELETE FROM records",
  "DELETE FROM product_events",
  "DELETE FROM stocks",
  "DELETE FROM images",
  "DELETE FROM listings",
  "DELETE FROM properties",
  "DELETE FROM product_category",
  "DELETE FROM categories",
  "DELETE FROM product_names",
  "DELETE FROM products",
  "DELETE FROM money",
  "DELETE FROM pockets",
  "DELETE FROM customers",
  "DELETE FROM suppliers",
  "DELETE FROM socials",
  "DELETE FROM extras",
  "DELETE FROM methods",
  "DELETE FROM sync_bookmark",
  "DELETE FROM sync_parked_money",
].join("; ");

/** A client device: its own database, its own store, one shared server. */
function setup(
  server = new FakeServer(),
  seed: Record<string, unknown> = {},
  /** Runs just before a push response is produced, to simulate a mid-flight edit. */
  beforePush?: () => void,
) {
  const { db, layer: dbLayer } = makeTestDatabase();
  db.exec(TRUNCATE);
  const { entries, layer: storeLayer } = makeTestStore({
    "sync.base_url": "https://sync.test",
    "sync.token": "kst_test",
    ...seed,
  });

  /** Every statement batch the merge applied, in order. */
  const merges: { sql: string }[][] = [];

  const transport: SyncTransport = {
    health() {
      return Promise.resolve({ status: 200, message: "ok" });
    },
    pull(_endpoint, input) {
      try {
        return lineStream(server.pull(input.group, input.after, input.limit, input.count === true));
      } catch (error) {
        return failedStream(error);
      }
    },
    push(_endpoint, input) {
      beforePush?.();
      return lineStream(server.push(input.body));
    },
    productPull(_endpoint, input) {
      try {
        return lineStream(server.productPull(input.productId));
      } catch (error) {
        return failedStream(error);
      }
    },
    productPush(_endpoint, input) {
      try {
        return lineStream(server.productPush(input.productId, input.body));
      } catch (error) {
        return failedStream(error);
      }
    },
    // The image-byte side channel (§8.7.1). None of the group tests here exercise
    // it — `blob.test.ts` owns that — but the transport is one type, so the fake
    // must still answer: an empty manifest, and bytes keyed by `(image, version)`.
    blobManifest() {
      return Promise.resolve({ blobs: [], more: false, next: null });
    },
    blobPut(_endpoint, input) {
      return Promise.resolve({
        status: 201,
        imageId: input.imageId,
        version: input.version,
        sha256: shaOf(input.imageId, input.version),
        byteSize: 1,
        mime: input.mime,
        deduped: false,
        current: true,
      });
    },
    blobGet(_endpoint, input) {
      return Promise.resolve({ sha256: input.sha256, byteSize: 1, mime: "image/png" });
    },
    // The combo-cover channel mirrors the image one; these group tests do not
    // move bytes, so an empty manifest and a digest answer are enough.
    comboCoverManifest() {
      return Promise.resolve({ blobs: [], more: false, next: null });
    },
    comboCoverPut(_endpoint, input) {
      return Promise.resolve({
        status: 201,
        comboId: input.comboId,
        version: input.version,
        sha256: shaOf(input.comboId, input.version),
        byteSize: 1,
        mime: input.mime,
        deduped: false,
        current: true,
      });
    },
    // One transaction, like `sync_merge` in Rust: a page either lands whole or
    // not at all.
    merge(statements) {
      // Recorded so a test can assert on the *work* a page caused: a page of this
      // device's own rows coming back must be one bookmark write, nothing more.
      merges.push(statements);
      db.exec("BEGIN");
      try {
        for (const statement of statements) {
          db.query(statement.sql).run(...(statement.bindings ?? []));
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      return Promise.resolve({ statements: statements.length });
    },
  };

  const moneyLayer = MoneyLive.pipe(Layer.provide(dbLayer));
  const customerLayer = CustomerLive.pipe(Layer.provide(dbLayer));
  const supplierLayer = SupplierLive.pipe(Layer.provide(dbLayer));
  const methodLayer = MethodLive.pipe(Layer.provide(dbLayer), Layer.provide(storeLayer));
  const socialLayer = SocialLive.pipe(Layer.provide(dbLayer));
  const extraLayer = ExtraLive.pipe(Layer.provide(dbLayer));
  const categoryLayer = CategoryLive.pipe(Layer.provide(dbLayer));
  const comboLayer = ComboLive.pipe(Layer.provide(dbLayer));
  const productLayer = ProductLive.pipe(Layer.provide(dbLayer));
  const recordLayer = RecordLive.pipe(Layer.provide(dbLayer), Layer.provide(productLayer));
  const transportLayer = Layer.succeed(SyncTransportService, transport);
  // The local-write bus, held here so a test can publish a write and assert the
  // cycle it started (``auto` sync`, below).
  const bus = Effect.runSync(PubSub.unbounded<SyncGroup>());
  const triggerLayer = Layer.succeed(SyncTriggerService, triggerOf(bus));
  const appLayer = SyncLive.pipe(
    Layer.provide(
      Layer.mergeAll(
        dbLayer,
        storeLayer,
        transportLayer,
        triggerLayer,
        moneyLayer,
        customerLayer,
        supplierLayer,
        methodLayer,
        socialLayer,
        extraLayer,
        categoryLayer,
        comboLayer,
        productLayer,
        recordLayer,
      ),
    ),
  );

  return { db, dbLayer, entries, storeLayer, server, merges, bus, layer: appLayer };
}

function runSync(
  layer: Layer.Layer<SyncService>,
  mode: "sync" | "reset" = "sync",
): Promise<SyncReport> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const sync = yield* SyncService;
      return yield* sync.run(mode);
    }).pipe(Effect.provide(layer)),
  );
}

type Db = ReturnType<typeof makeTestDatabase>["db"];

/** Inserts a row from the entity's dictionary; `syncAt` defaults to dirty. */
function insertRow(db: Db, entity: string, values: Record<string, unknown>): void {
  const def = TABLES[entity];
  if (def === undefined) throw new Error(`unknown entity ${entity}`);
  const columns = [...def.columns, def.syncAt];
  const bindings = [
    ...def.columns.map((column) => values[column] ?? null),
    values["syncAt"] ?? null,
  ];
  db.query(
    `INSERT INTO ${def.table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
  ).run(...(bindings as (string | number | null)[]));
}

/** Finds a child definition across every aggregate group. */
function childOfKey(key: string) {
  for (const group of SYNC_GROUPS) {
    const child = GROUPS[group].children?.find((entry) => entry.key === key);
    if (child !== undefined) return child;
  }
  throw new Error(`unknown child ${key}`);
}

/** Inserts an aggregate child; the parent key is inherited, never a wire column. */
function insertChild(db: Db, key: string, parentId: string, values: Record<string, unknown>): void {
  const child = childOfKey(key);
  // A `via: "listing"` child names its link row itself; only a direct child
  // inherits the aggregate key from the helper.
  const columns = child.via === "parent" ? [child.parent, ...child.columns] : [...child.columns];
  const bindings =
    child.via === "parent"
      ? [parentId, ...child.columns.map((column) => values[column] ?? null)]
      : child.columns.map((column) => values[column] ?? null);
  db.query(
    `INSERT INTO ${child.table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
  ).run(...(bindings as (string | number | null)[]));
}

function wireRow(entity: string, values: Record<string, unknown>): WireRow {
  const def = TABLES[entity];
  if (def === undefined) throw new Error(`unknown entity ${entity}`);
  const out: WireRow = {};
  for (const column of def.columns) {
    const value = values[column];
    out[column] = value === undefined ? null : (value as string | number | null);
  }
  return out;
}

function customer(id: string, name: string, updatedAt: number): WireRow {
  return wireRow("customer", {
    customer_id: id,
    customer_name: name,
    customer_phone: "",
    customer_updated_at: updatedAt,
    customer_deleted_at: null,
  });
}

function recordHeader(id: string, updatedAt: number, note = ""): WireRow {
  return wireRow("record", {
    record_id: id,
    record_created_at: 1_000,
    record_paid_at: 1_000,
    record_rounding: 0,
    record_credit_at: null,
    record_cashier: "c_01",
    record_mode: "incoming",
    record_pay: 25_000,
    record_note: note,
    record_fix: 0,
    record_customer_name: "",
    record_customer_phone: "",
    record_sub_total: 25_000,
    record_total: 25_000,
    record_updated_at: updatedAt,
    record_deleted_at: null,
    record_supplier_id: null,
    record_supplier_name: "",
    record_flag: 0,
    record_pair_id: null,
  });
}

function wireChild(key: string, values: Record<string, unknown>): WireRow {
  const child = childOfKey(key);
  const out: WireRow = {};
  for (const column of child.columns) {
    const value = values[column];
    out[column] = value === undefined ? null : (value as string | number | null);
  }
  return out;
}

function recordChildren(): WireChildren {
  const children = emptyChildren();
  children["record_listings"] = [
    wireChild("record_listings", {
      record_listing_id: "rl_01",
      record_listing_group_id: "rg_01",
      product_event_id: null,
      product_id: "p_remote",
      record_listing_name: "Kopi Susu 250ml",
      record_listing_kind: "",
      record_listing_unit: 1,
      record_listing_price: 25_000,
      record_listing_qty: 1,
      record_listing_capital: 15_000,
      record_listing_total: 25_000,
    }),
  ];
  children["record_methods"] = [
    wireChild("record_methods", {
      record_method_id: "rm_01",
      method_id: "m_remote",
      record_method_pay: 25_000,
    }),
  ];
  return children;
}

function comboHeader(id: string, updatedAt: number, name = "Kopi Susu"): WireRow {
  return wireRow("combo", {
    combo_id: id,
    combo_name: name,
    combo_active: 1,
    combo_cover_name: null,
    combo_cover_mime: null,
    combo_updated_at: updatedAt,
    combo_deleted_at: null,
  });
}

function comboChildren(): WireChildren {
  const children = emptyChildren("combo");
  children["combo_listings"] = [
    wireChild("combo_listings", {
      combo_listing_id: "cl_01",
      listing_id: "l_remote",
      combo_listing_qty: 2,
      combo_listing_order: 0,
    }),
  ];
  children["combo_extras"] = [
    wireChild("combo_extras", {
      combo_extra_id: "ce_01",
      extra_id: "ex_remote",
      combo_extra_order: 0,
    }),
  ];
  children["combo_discounts"] = [
    wireChild("combo_discounts", {
      combo_discount_id: "cd_01",
      combo_listing_id: "cl_01",
      combo_discount_value: 10,
      combo_discount_kind: "percent",
      combo_discount_order: 0,
    }),
  ];
  return children;
}

// ============================================================================
// The merge rules (§5)
// ============================================================================

describe("the merge rules", () => {
  test("plain LWW: newer wins, a tie keeps the stored copy", () => {
    const def = TABLES["customer"]!;
    expect(decide(def, customer("c_01", "Ani", 10), customer("c_01", "Budi", 11))).toBe("applied");
    expect(decide(def, customer("c_01", "Ani", 11), customer("c_01", "Budi", 10))).toBe("stale");
    expect(decide(def, customer("c_01", "Ani", 10), customer("c_01", "Budi", 10))).toBe("stale");
    expect(decide(def, customer("c_01", "Ani", 10), customer("c_01", "Ani", 10))).toBe("noop");
  });

  test("money: a note edit is accepted, an amount edit is not", () => {
    const def = TABLES["money"]!;
    const base = wireRow("money", {
      money_id: "m_01",
      timestamp: 1_000,
      money_value: 5_000,
      pocket_id: "p_01",
      money_note: "",
      money_updated_at: 10,
      money_deleted_at: null,
    });
    const noted = { ...base, money_note: "kopi", money_updated_at: 11 };
    const revalued = { ...base, money_value: 9_999, money_updated_at: 11 };
    expect(decide(def, base, noted)).toBe("applied");
    expect(decide(def, base, revalued)).toBe("stale");
    expect(decide(def, base, base)).toBe("noop");
  });

  test("append-only: an existing id is a noop whatever the payload", () => {
    const def = TABLES["product_event"]!;
    const event = wireRow("product_event", {
      product_event_id: "pe_01",
      product_event_created_at: 1_000,
      product_event_value: -1,
      product_event_capital: 5_000,
      product_event_note: "",
      product_id: "p_01",
      stock_id: null,
      record_id: null,
    });
    expect(decide(def, event, { ...event, product_event_value: 99 })).toBe("noop");
  });

  test("aggregate: same children in another order is a noop", () => {
    const def = TABLES["record"]!;
    const children = GROUPS.record.children!;
    const ch = recordChildren();
    const reversed = {
      ...ch,
      record_listings: [...(ch["record_listings"] ?? [])].reverse(),
      record_methods: [...(ch["record_methods"] ?? [])].reverse(),
    };
    expect(
      sameAggregate(
        def,
        children,
        recordHeader("r_01", 10),
        ch,
        recordHeader("r_01", 10),
        reversed,
      ),
    ).toBe(true);
    expect(
      decideAggregate(def, children, recordHeader("r_01", 10), ch, recordHeader("r_01", 11), ch),
    ).toBe("applied");
    expect(
      decideAggregate(def, children, recordHeader("r_01", 11), ch, recordHeader("r_01", 10), ch),
    ).toBe("stale");
  });

  test("aggregate: a child omitted from a newer frame means the child is deleted", () => {
    const def = TABLES["record"]!;
    const children = GROUPS.record.children!;
    const ch = recordChildren();
    const fewer = { ...ch, record_methods: [] };
    expect(
      sameAggregate(def, children, recordHeader("r_01", 10), ch, recordHeader("r_01", 10), fewer),
    ).toBe(false);
  });
});

describe("frame parsing", () => {
  test("an unknown t and another group's entity are skipped, not fatal (§2.9)", () => {
    expect(parsePullFrame("customer", { t: "weird" })).toBeNull();
    expect(
      parsePullFrame("customer", {
        t: "row",
        s: 1,
        e: "money",
        r: { money_id: "m_01" },
      }),
    ).toBeNull();
    expect(parsePullFrame("customer", { t: "row", s: 2, e: "nope", r: {} })).toBeNull();
  });

  test("a record sent as a bare row is a protocol error, not a silent skip", () => {
    expect(() =>
      parsePullFrame("record", { t: "row", s: 1, e: "record", r: recordHeader("r_01", 1) }),
    ).toThrow();
  });
});

// ============================================================================
// A whole cycle
// ============================================================================

describe("sync cycle", () => {
  test("every group is visited and reported", async () => {
    const device = setup();
    const { report, state } = await Effect.runPromise(
      Effect.gen(function* () {
        const sync = yield* SyncService;
        const report = yield* sync.run("sync");
        const head = yield* Stream.runHead(sync.state);
        return { report, state: Option.getOrNull(head) };
      }).pipe(Effect.provide(device.layer)),
    );

    expect(state?.groups.map((group) => group.group)).toEqual([...SYNC_GROUPS]);
    expect(Object.keys(report.groups)).toEqual([...SYNC_GROUPS]);
    for (const group of SYNC_GROUPS) {
      expect(state?.groups.find((entry) => entry.group === group)?.phase).toBe("done");
    }
  });

  test("a first sync uploads the local rows and pulls them back marked synced", async () => {
    const device = setup();
    insertRow(device.db, "pocket", {
      pocket_id: "p_01",
      pocket_name: "Kas",
      pocket_type: "absolute",
      pocket_ordering: 1,
      pocket_updated_at: 1_000,
    });
    insertRow(device.db, "money", {
      money_id: "m_01",
      timestamp: 1_000,
      money_value: 5_000,
      pocket_id: "p_01",
      money_note: "",
      money_updated_at: 1_000,
    });

    const report = await runSync(device.layer);

    expect(device.server.counter).toBe(2);
    expect(report.groups.money.bookmark).toBe(2);
    const money = device.db
      .query("SELECT money_sync_at FROM money WHERE money_id = 'm_01'")
      .get() as { money_sync_at: number };
    expect(money.money_sync_at).toBe(2);
    const pocket = device.db
      .query("SELECT pocket_sync_at FROM pockets WHERE pocket_id = 'p_01'")
      .get() as { pocket_sync_at: number };
    expect(pocket.pocket_sync_at).toBe(1);
  });

  test("the closing pull reads this device's own upload without merging it", async () => {
    // §9.2: the final pull hands back the entries this device's push created. They
    // are `noop`s — the row is already here, with the seq the ack carried — but they
    // used to be re-merged page by page: 1,200 rows meant three more pages of
    // statements describing changes that had already happened.
    const device = setup();
    insertRow(device.db, "pocket", {
      pocket_id: "p_01",
      pocket_name: "Kas",
      pocket_type: "absolute",
      pocket_ordering: 1,
      pocket_updated_at: 1_000,
    });
    for (let index = 0; index < 1_200; index += 1) {
      insertRow(device.db, "money", {
        money_id: `m_${String(index).padStart(4, "0")}`,
        timestamp: 1_000 + index,
        money_value: 1_000 + index,
        pocket_id: "p_01",
        money_note: "",
        money_updated_at: 1_000,
      });
    }

    const report = await runSync(device.layer);

    // Everything this device owed went up.
    expect(report.pushed).toBe(1_201);
    // Nothing came back down: the entries it just created were dropped as they
    // arrived, so the run does not report downloading its own upload.
    expect(report.pulled).toBe(0);
    // The bookmark still moved past them — the rows were read, and re-asking for
    // the same seq would be the same page forever.
    expect(report.groups.money.bookmark).toBe(device.server.counter);
    // Only the two push batches wrote anything substantial. Every other merge in
    // the run is a bookmark write.
    const substantial = device.merges
      .filter((batch) => batch.length > 2)
      .map((batch) => batch.length);
    expect(substantial).toEqual([1_000, 201]);
  });

  test("a category and its link travel in the product group", async () => {
    // Categories are catalogue rows in the product group (migration-53): one
    // bookmark, one log, plain LWW. The link is what a product form writes, and
    // it must arrive after the two rows it names — the order the group's entity
    // list fixes.
    const server = new FakeServer();
    const first = setup(server);
    insertRow(first.db, "product", {
      product_id: "p_01",
      product_name: "Kopi Susu",
      product_note: "",
      product_flag: 0,
      product_updated_at: 1_000,
    });
    insertRow(first.db, "category", {
      category_id: "c_01",
      category_name: "Minuman",
      category_updated_at: 1_000,
    });
    insertRow(first.db, "product_category", {
      product_category_id: "pc_01",
      product_id: "p_01",
      category_id: "c_01",
      product_category_updated_at: 1_000,
    });

    await runSync(first.layer);

    // Parents before children, and the category ahead of the link that names it.
    expect(server.changes.map((change) => change.entity)).toEqual([
      "product",
      "category",
      "product_category",
    ]);

    const second = setup(server);
    await runSync(second.layer);

    expect(second.db.query("SELECT category_name, category_sync_at FROM categories").all()).toEqual(
      [{ category_name: "Minuman", category_sync_at: 2 }],
    );
    expect(
      second.db
        .query("SELECT product_id, category_id, product_category_sync_at FROM product_category")
        .all(),
    ).toEqual([{ product_id: "p_01", category_id: "c_01", product_category_sync_at: 3 }]);
  });

  test("un-ticking a category is a tombstone, and re-ticking is a new link row", async () => {
    const server = new FakeServer();
    const first = setup(server);
    insertRow(first.db, "product", {
      product_id: "p_01",
      product_name: "Kopi Susu",
      product_note: "",
      product_flag: 0,
      product_updated_at: 1_000,
    });
    insertRow(first.db, "category", {
      category_id: "c_01",
      category_name: "Minuman",
      category_updated_at: 1_000,
    });
    insertRow(first.db, "product_category", {
      product_category_id: "pc_01",
      product_id: "p_01",
      category_id: "c_01",
      product_category_updated_at: 1_000,
    });
    await runSync(first.layer);

    first.db
      .query(
        `UPDATE product_category SET product_category_deleted_at = 2000,
             product_category_updated_at = 2000, product_category_sync_at = NULL
           WHERE product_category_id = 'pc_01'`,
      )
      .run();
    insertRow(first.db, "product_category", {
      product_category_id: "pc_02",
      product_id: "p_01",
      category_id: "c_01",
      product_category_updated_at: 3_000,
    });
    await runSync(first.layer);

    // Both lifetimes are on the server: the tombstone and the new link.
    expect(
      server.changes
        .filter((change) => change.entity === "product_category")
        .map((change) => [
          change.row["product_category_id"],
          change.row["product_category_deleted_at"],
        ]),
    ).toEqual([
      ["pc_01", null],
      ["pc_01", 2_000],
      ["pc_02", null],
    ]);

    const second = setup(server);
    await runSync(second.layer);
    expect(
      second.db
        .query(
          `SELECT product_category_id, product_category_deleted_at FROM product_category
            ORDER BY product_category_id`,
        )
        .all(),
    ).toEqual([
      { product_category_id: "pc_01", product_category_deleted_at: 2_000 },
      { product_category_id: "pc_02", product_category_deleted_at: null },
    ]);
  });

  test("a link survives when its category has not been pushed yet", async () => {
    // The scoped push skips `category` on purpose (`SYNC-V2-ONE-PRODUCT.md` §1.1),
    // so a till that ticks a category it just created lands a link whose category
    // the server has never seen. That page is legal (§7.2) and has to be stored:
    // before migration-55 the hard key to `categories` aborted the page commit and
    // the group never moved past it again.
    const server = new FakeServer();
    const first = setup(server);
    insertProduct(first.db, "P1", "Kopi", 1_000);
    insertRow(first.db, "category", {
      category_id: "C1",
      category_name: "Minuman",
      category_updated_at: 1_000,
    });
    insertRow(first.db, "product_category", {
      product_category_id: "PC1",
      product_id: "P1",
      category_id: "C1",
      product_category_updated_at: 1_000,
    });

    // Only the product and its link go up; the category waits for a full cycle.
    await runProductSync(first.layer, "P1");
    expect(server.changes.map((change) => change.entity)).toEqual(["product", "product_category"]);

    // The other till pulls the scope without ever seeing a category.
    const second = setup(server);
    const pulled = await runProductSync(second.layer, "P1");
    expect(pulled.pulled).toBe(2);
    expect(second.db.query("SELECT COUNT(*) AS n FROM categories").get()).toEqual({ n: 0 });
    expect(
      second.db.query("SELECT category_id, product_category_sync_at FROM product_category").all(),
    ).toEqual([{ category_id: "C1", product_category_sync_at: 2 }]);

    // The full cycle finally supplies the category: the stored link was already
    // pointing at it, so it starts drawing with no second pull of its own.
    await runSync(first.layer);
    await runSync(second.layer);
    expect(second.db.query("SELECT category_name FROM categories").all()).toEqual([
      { category_name: "Minuman" },
    ]);
    expect(second.db.query("SELECT COUNT(*) AS n FROM product_category").get()).toEqual({ n: 1 });
  });

  test("two tills ticking the same box keep both link rows", async () => {
    // The server keeps both (its `0019` migration says so: "the client's existing
    // merge keeps both"), and the local unique pair index used to abort the page
    // instead. One category is still drawn once, because the form reads links by
    // `category_id`.
    const server = new FakeServer();
    const first = setup(server);
    insertProduct(first.db, "P1", "Kopi", 1_000);
    insertRow(first.db, "category", {
      category_id: "C1",
      category_name: "Minuman",
      category_updated_at: 1_000,
    });
    insertRow(first.db, "product_category", {
      product_category_id: "PC1",
      product_id: "P1",
      category_id: "C1",
      product_category_updated_at: 1_000,
    });
    await runSync(first.layer);

    // A second till ticks the same category for the same product while offline.
    const second = setup(server);
    insertProduct(second.db, "P1", "Kopi", 1_000);
    insertRow(second.db, "category", {
      category_id: "C1",
      category_name: "Minuman",
      category_updated_at: 1_000,
    });
    insertRow(second.db, "product_category", {
      product_category_id: "PC2",
      product_id: "P1",
      category_id: "C1",
      product_category_updated_at: 1_000,
    });
    await runSync(second.layer);

    await runSync(first.layer);
    expect(
      first.db
        .query(
          `SELECT product_category_id FROM product_category
            WHERE product_category_deleted_at IS NULL ORDER BY product_category_id`,
        )
        .all(),
    ).toEqual([{ product_category_id: "PC1" }, { product_category_id: "PC2" }]);
  });

  test("the same category name created on two tills is kept", async () => {
    // `category_name_unique` used to make the second name abort the page on both
    // devices. It is a rule of the picker, not of the wire, so the service asks it
    // (migration-55) and a row another till created is stored and shown.
    const server = new FakeServer();
    const first = setup(server);
    insertRow(first.db, "category", {
      category_id: "C1",
      category_name: "Minuman",
      category_updated_at: 1_000,
    });
    await runSync(first.layer);

    const second = setup(server);
    insertRow(second.db, "category", {
      category_id: "C2",
      category_name: "minuman",
      category_updated_at: 1_000,
    });
    await runSync(second.layer);

    await runSync(first.layer);
    expect(
      first.db
        .query(
          `SELECT category_name FROM categories
            WHERE category_deleted_at IS NULL ORDER BY category_id`,
        )
        .all(),
    ).toEqual([{ category_name: "Minuman" }, { category_name: "minuman" }]);
  });

  test("a duplicate barcode, property key or alias from another till is kept", async () => {
    // Three more rules `migration-43` held with unique indexes and `migration-56`
    // moved into `ProductService`. The server has no such index, so a second till
    // that was offline may legally have written the same code, key or alias; an
    // index here aborted the page and stranded the whole product group.
    const server = new FakeServer();
    const first = setup(server);
    const seed = (device: ReturnType<typeof setup>, suffix: string) => {
      insertProduct(device.db, "P1", "Kopi", 1_000);
      insertRow(device.db, "listing", {
        listing_id: `L${suffix}`,
        product_id: "P1",
        listing_name: `Kopi ${suffix}`,
        listing_price: 1_000,
        listing_unit: 1,
        listing_kind: "",
        listing_code: "ABC",
        listing_updated_at: 1_000,
      });
      insertRow(device.db, "property", {
        property_id: `PR${suffix}`,
        product_id: "P1",
        property_key: "origin",
        property_value: "Aceh",
        property_updated_at: 1_000,
      });
      insertRow(device.db, "product_name", {
        product_name_id: `N${suffix}`,
        product_id: "P1",
        product_name_value: "Kopi Susu",
        product_name_updated_at: 1_000,
      });
    };

    seed(first, "1");
    await runSync(first.layer);

    const second = setup(server);
    seed(second, "2");
    await runSync(second.layer);

    // The first device stores the second one's rows rather than failing the page.
    await runSync(first.layer);
    expect(
      first.db
        .query(
          "SELECT listing_code FROM listings WHERE listing_deleted_at IS NULL ORDER BY listing_id",
        )
        .all(),
    ).toEqual([{ listing_code: "ABC" }, { listing_code: "ABC" }]);
    expect(
      first.db.query("SELECT property_key FROM properties ORDER BY property_id").all(),
    ).toEqual([{ property_key: "origin" }, { property_key: "origin" }]);
    expect(
      first.db.query("SELECT product_name_value FROM product_names ORDER BY product_name_id").all(),
    ).toEqual([{ product_name_value: "Kopi Susu" }, { product_name_value: "Kopi Susu" }]);
  });

  test("a second device pulls what the first pushed, in log order", async () => {
    const server = new FakeServer();
    const first = setup(server);
    insertRow(first.db, "customer", {
      customer_id: "c_01",
      customer_name: "Ani",
      customer_phone: "0812",
      customer_updated_at: 1_000,
    });
    insertRow(first.db, "supplier", {
      supplier_id: "s_01",
      supplier_name: "Toko A",
      supplier_note: "",
      supplier_updated_at: 1_000,
    });
    await runSync(first.layer);

    const second = setup(server);
    await runSync(second.layer);

    expect(second.db.query("SELECT customer_name FROM customers").all()).toEqual([
      { customer_name: "Ani" },
    ]);
    expect(second.db.query("SELECT supplier_name FROM suppliers").all()).toEqual([
      { supplier_name: "Toko A" },
    ]);
  });

  test("a bookmark the server refuses is re-seeded, not discarded", async () => {
    const device = setup(undefined, { "sync.money.bookmark": 999 });
    // A synced row this device believes the server already has.
    insertRow(device.db, "pocket", {
      pocket_id: "p_01",
      pocket_name: "Kas",
      pocket_type: "absolute",
      pocket_ordering: 1,
      pocket_updated_at: 1_000,
      syncAt: 500,
    });
    device.server.push(
      `${JSON.stringify({
        e: "pocket",
        r: wireRow("pocket", {
          pocket_id: "p_02",
          pocket_name: "Bank",
          pocket_type: "absolute",
          pocket_ordering: 2,
          pocket_updated_at: 1_000,
          pocket_deleted_at: null,
        }),
      })}\n`,
    );

    await runSync(device.layer);

    // Nothing was deleted; the refused row was kept and re-uploaded, and the
    // server's own pocket was pulled.
    const names = device.db.query("SELECT pocket_name FROM pockets ORDER BY pocket_name").all() as {
      pocket_name: string;
    }[];
    expect(names.map((row) => row.pocket_name)).toEqual(["Bank", "Kas"]);
    // The table is authoritative now; the legacy store key is never read again.
    expect(
      device.db.query("SELECT seq FROM sync_bookmark WHERE group_name = 'money'").get(),
    ).toBeDefined();
  });

  test("a 410 re-seeds from the floor, never from zero", async () => {
    const device = setup();
    // Two server changes, then the floor moves past the device's bookmark.
    device.server.push(`${JSON.stringify({ e: "customer", r: customer("c_01", "Ani", 1_000) })}\n`);
    device.server.push(
      `${JSON.stringify({ e: "customer", r: customer("c_02", "Budi", 1_000) })}\n`,
    );
    device.server.floor = 2;

    await runSync(device.layer);

    // The first pull was refused, and the retry asked from the floor — never
    // from `0`, which is below it and would loop (§9.8).
    const customerPulls = device.server.pulls
      .filter((pull) => pull.group === "customer")
      .map((pull) => pull.after);
    expect(customerPulls).toContain(2);
    expect(customerPulls.slice(1)).not.toContain(0);
    const bookmark = device.db
      .query("SELECT seq FROM sync_bookmark WHERE group_name = 'customer'")
      .get() as { seq: number };
    expect(bookmark.seq).toBe(2);
    // Nothing at or below the floor is served; the device starts empty and moves
    // forward from there.
    expect(device.db.query("SELECT customer_name FROM customers").all()).toEqual([]);
  });

  test("Sinkronisasi Ulang queues every row so a device from before v2 gets uploaded", async () => {
    const device = setup();
    insertRow(device.db, "pocket", {
      pocket_id: "p_01",
      pocket_name: "Kas",
      pocket_type: "absolute",
      pocket_ordering: 1,
      pocket_updated_at: 1_000,
      syncAt: 123_456,
    });

    await runSync(device.layer, "reset");

    expect(device.server.counter).toBe(1);
    const pocket = device.db
      .query("SELECT pocket_sync_at FROM pockets WHERE pocket_id = 'p_01'")
      .get() as { pocket_sync_at: number };
    expect(pocket.pocket_sync_at).toBe(1);
  });

  test("a money row whose pocket is unknown is parked, then written once it arrives", async () => {
    const device = setup();
    const money = wireRow("money", {
      money_id: "m_09",
      timestamp: 1_000,
      money_value: 7_000,
      pocket_id: "p_01",
      money_note: "",
      money_updated_at: 1_000,
      money_deleted_at: null,
    });
    device.server.push(`${JSON.stringify({ e: "money", r: money })}\n`);

    await runSync(device.layer);
    expect(device.db.query("SELECT money_id FROM money").all()).toEqual([]);
    const parked = device.db.query("SELECT money_id, seq FROM sync_parked_money").all() as {
      money_id: string;
      seq: number;
    }[];
    expect(parked).toEqual([{ money_id: "m_09", seq: 1 }]);

    device.server.push(
      `${JSON.stringify({
        e: "pocket",
        r: wireRow("pocket", {
          pocket_id: "p_01",
          pocket_name: "Kas",
          pocket_type: "absolute",
          pocket_ordering: 1,
          pocket_updated_at: 1_000,
          pocket_deleted_at: null,
        }),
      })}\n`,
    );
    await runSync(device.layer);

    expect(device.db.query("SELECT money_id FROM money").all()).toEqual([{ money_id: "m_09" }]);
    expect(device.db.query("SELECT money_id FROM sync_parked_money").all()).toEqual([]);
  });
});

// ============================================================================
// The product group's stock projection (§8.7)
// ============================================================================

describe("product stock projection", () => {
  test("pulled events fold back into the local stock cache", async () => {
    const server = new FakeServer();
    const first = setup(server);
    insertRow(first.db, "product", {
      product_id: "p_01",
      product_name: "Kopi",
      product_note: "",
      product_flag: 0,
      product_updated_at: 1_000,
    });
    insertRow(first.db, "product_event", {
      product_event_id: "pe_01",
      product_event_created_at: 1_000,
      product_event_value: 10,
      product_event_capital: 5_000,
      product_event_note: "",
      product_id: "p_01",
      stock_id: "s_01",
      record_id: null,
    });
    insertRow(first.db, "product_event", {
      product_event_id: "pe_02",
      product_event_created_at: 2_000,
      product_event_value: -3,
      product_event_capital: 5_000,
      product_event_note: "",
      product_id: "p_01",
      stock_id: "s_01",
      record_id: null,
    });
    await runSync(first.layer);

    const second = setup(server);
    await runSync(second.layer);

    // `stocks` is not synced; the journal is. The device folds it into a lot:
    // value = sum of the deltas, capital = the newest event's capital.
    expect(
      second.db
        .query("SELECT stock_id, stock_value, stock_capital FROM stocks ORDER BY stock_id")
        .all(),
    ).toEqual([{ stock_id: "s_01", stock_value: 7, stock_capital: 5_000 }]);
  });

  test("a rebuild that moves a lot's cost is logged, not silent", async () => {
    const server = new FakeServer();
    const first = setup(server);
    insertRow(first.db, "product", {
      product_id: "p_01",
      product_name: "Kopi",
      product_note: "",
      product_flag: 0,
      product_updated_at: 1_000,
    });
    insertRow(first.db, "product_event", {
      product_event_id: "pe_01",
      product_event_created_at: 1_000,
      product_event_value: 10,
      product_event_capital: 5_000,
      product_event_note: "",
      product_id: "p_01",
      stock_id: "s_01",
      record_id: null,
    });
    // A cached lot that disagrees with the journal — the shape of the reported
    // "my capital changed after syncing".
    first.db
      .query(
        `INSERT INTO stocks (stock_id, product_id, stock_value, stock_capital,
            stock_created_at, stock_updated_at) VALUES ('s_01', 'p_01', 10, 8_000, 1_000, 1_000)`,
      )
      .run();

    await runSync(first.layer);

    expect(
      first.db.query("SELECT stock_capital FROM stocks WHERE stock_id = 's_01'").get(),
    ).toEqual({ stock_capital: 5_000 });
  });

  test("a page of rows this device already had folds no stock lots", async () => {
    // Two tills holding the same catalogue. The second one pulls a page of `noop`s —
    // rows it already has, byte for byte — and that page used to re-derive a lot for
    // *every product on it*: on a shop-sized journal, seconds per page spent proving
    // that nothing had changed.
    const server = new FakeServer();
    const first = setup(server);
    const product = {
      product_id: "p_01",
      product_name: "Kopi",
      product_note: "",
      product_flag: 0,
      product_updated_at: 1_000,
    };
    const event = {
      product_event_id: "pe_01",
      product_event_created_at: 1_000,
      product_event_value: 10,
      product_event_capital: 5_000,
      product_event_note: "",
      product_id: "p_01",
      stock_id: "s_01",
      record_id: null,
    };
    insertRow(first.db, "product", product);
    insertRow(first.db, "product_event", event);
    await runSync(first.layer);

    const second = setup(server);
    insertRow(second.db, "product", product);
    insertRow(second.db, "product_event", event);
    // The fold this device would have done when its own copy was written.
    second.db
      .query(
        `INSERT INTO stocks (stock_id, product_id, stock_value, stock_capital,
            stock_created_at, stock_updated_at) VALUES ('s_01', 'p_01', 10, 5_000, 1_000, 1_000)`,
      )
      .run();
    const before = second.merges.length;

    const report = await runSync(second.layer);

    // The page did arrive, and every row on it was a `noop`.
    expect(report.pulled).toBe(2);
    expect(report.groups.product.stale).toBe(0);
    const sql = second.merges
      .slice(before)
      .flat()
      .map((statement) => statement.sql);
    expect(sql.some((text) => text.includes("INSERT INTO stocks"))).toBe(false);
    expect(second.db.query("SELECT stock_value, stock_capital FROM stocks").all()).toEqual([
      { stock_value: 10, stock_capital: 5_000 },
    ]);
  });

  test("an event that carries no cost does not erase the lot's cost", async () => {
    const server = new FakeServer();
    const first = setup(server);
    insertRow(first.db, "product", {
      product_id: "p_01",
      product_name: "Kopi",
      product_note: "",
      product_flag: 0,
      product_updated_at: 1_000,
    });
    insertRow(first.db, "product_event", {
      product_event_id: "pe_01",
      product_event_created_at: 1_000,
      product_event_value: 10,
      product_event_capital: 5_000,
      product_event_note: "",
      product_id: "p_01",
      stock_id: "s_01",
      record_id: null,
    });
    // A later movement with capital 0: a bonus fill, or a lot opened with no cost
    // to copy. `0` is how the journal says "this says nothing about the cost", so
    // it must not overwrite the 5 000 the lot was actually bought for.
    insertRow(first.db, "product_event", {
      product_event_id: "pe_02",
      product_event_created_at: 2_000,
      product_event_value: 0,
      product_event_capital: 0,
      product_event_note: "Bonus",
      product_id: "p_01",
      stock_id: "s_01",
      record_id: null,
    });
    await runSync(first.layer);

    const second = setup(server);
    await runSync(second.layer);

    expect(
      second.db
        .query("SELECT stock_id, stock_value, stock_capital FROM stocks ORDER BY stock_id")
        .all(),
    ).toEqual([{ stock_id: "s_01", stock_value: 10, stock_capital: 5_000 }]);
  });

  test("the newest cost wins, not the oldest", async () => {
    const server = new FakeServer();
    const first = setup(server);
    insertRow(first.db, "product", {
      product_id: "p_01",
      product_name: "Kopi",
      product_note: "",
      product_flag: 0,
      product_updated_at: 1_000,
    });
    for (const [id, at, value, capital] of [
      ["pe_01", 1_000, 10, 5_000],
      ["pe_02", 2_000, 0, 6_000],
    ] as const) {
      insertRow(first.db, "product_event", {
        product_event_id: id,
        product_event_created_at: at,
        product_event_value: value,
        product_event_capital: capital,
        product_event_note: "",
        product_id: "p_01",
        stock_id: "s_01",
        record_id: null,
      });
    }
    await runSync(first.layer);

    const second = setup(server);
    await runSync(second.layer);

    // A capital correction is a delta-0 event, so the newest figure is the lot's.
    expect(
      second.db.query("SELECT stock_capital FROM stocks WHERE stock_id = 's_01'").get(),
    ).toEqual({ stock_capital: 6_000 });
  });
});

// ============================================================================
// The record aggregate (§5.5, §8.8)
// ============================================================================

describe("record aggregate", () => {
  test("a whole aggregate travels as one frame, children included", async () => {
    const server = new FakeServer();
    const first = setup(server);
    insertRow(first.db, "record", recordHeader("r_01", 1_000) as Record<string, unknown>);
    for (const [key, rows] of Object.entries(recordChildren())) {
      for (const row of rows) insertChild(first.db, key, "r_01", row as Record<string, unknown>);
    }

    await runSync(first.layer);
    // One frame, one seq — never one per child.
    expect(server.changes.map((change) => change.entity)).toEqual(["record"]);

    const second = setup(server);
    await runSync(second.layer);

    expect(second.db.query("SELECT record_id FROM records").all()).toEqual([{ record_id: "r_01" }]);
    expect(second.db.query("SELECT record_listing_id FROM record_listings").all()).toEqual([
      { record_listing_id: "rl_01" },
    ]);
    expect(second.db.query("SELECT record_method_id FROM record_methods").all()).toEqual([
      { record_method_id: "rm_01" },
    ]);
  });

  test("a newer aggregate replaces the children wholesale", async () => {
    const server = new FakeServer();
    const first = setup(server);
    insertRow(first.db, "record", recordHeader("r_01", 1_000) as Record<string, unknown>);
    for (const [key, rows] of Object.entries(recordChildren())) {
      for (const row of rows) insertChild(first.db, key, "r_01", row as Record<string, unknown>);
    }
    await runSync(first.layer);

    // A newer aggregate with no methods: the child set is replaced, not merged.
    const fewer = recordChildren();
    fewer["record_methods"] = [];
    server.push(
      `${JSON.stringify({ e: "record", r: recordHeader("r_01", 2_000, "koreksi"), ch: fewer })}\n`,
    );

    await runSync(first.layer);

    expect(first.db.query("SELECT record_note FROM records").all()).toEqual([
      { record_note: "koreksi" },
    ]);
    expect(first.db.query("SELECT record_method_id FROM record_methods").all()).toEqual([]);
  });

  test("a stale ack repairs the local aggregate with the server's winner", async () => {
    const device = setup();
    // The server already has a newer version than the one this device will push.
    const winner = recordChildren();
    winner["record_methods"] = [];
    device.server.push(
      `${JSON.stringify({ e: "record", r: recordHeader("r_01", 5_000, "server"), ch: winner })}\n`,
    );
    insertRow(device.db, "record", recordHeader("r_01", 1_000, "lokal") as Record<string, unknown>);
    for (const [key, rows] of Object.entries(recordChildren())) {
      for (const row of rows) insertChild(device.db, key, "r_01", row as Record<string, unknown>);
    }

    await runSync(device.layer);

    expect(device.db.query("SELECT record_note FROM records").all()).toEqual([
      { record_note: "server" },
    ]);
    expect(device.db.query("SELECT record_method_id FROM record_methods").all()).toEqual([]);
  });

  test("a soft-deleted record keeps its children", async () => {
    const server = new FakeServer();
    const first = setup(server);
    insertRow(first.db, "record", recordHeader("r_01", 1_000) as Record<string, unknown>);
    for (const [key, rows] of Object.entries(recordChildren())) {
      for (const row of rows) insertChild(first.db, key, "r_01", row as Record<string, unknown>);
    }
    await runSync(first.layer);

    // A delete is a normal aggregate with the tombstone set; the children stay.
    const deleted = recordChildren();
    server.push(
      `${JSON.stringify({
        e: "record",
        r: { ...recordHeader("r_01", 2_000), record_deleted_at: 2_000 },
        ch: deleted,
      })}\n`,
    );

    const second = setup(server);
    await runSync(second.layer);

    expect(second.db.query("SELECT record_deleted_at FROM records").get()).toBeDefined();
    expect(second.db.query("SELECT COUNT(*) AS total FROM record_listings").get()).toEqual({
      total: 1,
    });
  });
});

// ============================================================================
// Local edits, the clock and the dirty flag (§5.1.1, §9.4)
// ============================================================================

describe("combo aggregate", () => {
  test("a whole combo travels as one frame, children included", async () => {
    const server = new FakeServer();
    const first = setup(server);
    insertRow(first.db, "combo", comboHeader("cb_01", 1_000) as Record<string, unknown>);
    for (const [key, rows] of Object.entries(comboChildren())) {
      for (const row of rows) insertChild(first.db, key, "cb_01", row as Record<string, unknown>);
    }

    await runSync(first.layer);
    expect(server.changes.map((change) => change.entity)).toEqual(["combo"]);

    const second = setup(server);
    await runSync(second.layer);

    expect(second.db.query("SELECT combo_id FROM combos").all()).toEqual([{ combo_id: "cb_01" }]);
    expect(second.db.query("SELECT combo_listing_id FROM combo_listings").all()).toEqual([
      { combo_listing_id: "cl_01" },
    ]);
    expect(second.db.query("SELECT combo_extra_id FROM combo_extras").all()).toEqual([
      { combo_extra_id: "ce_01" },
    ]);
    expect(second.db.query("SELECT combo_discount_id FROM combo_discounts").all()).toEqual([
      { combo_discount_id: "cd_01" },
    ]);
  });

  test("a newer combo replaces every child set wholesale", async () => {
    const server = new FakeServer();
    const device = setup(server);
    insertRow(device.db, "combo", comboHeader("cb_01", 1_000) as Record<string, unknown>);
    for (const [key, rows] of Object.entries(comboChildren())) {
      for (const row of rows) insertChild(device.db, key, "cb_01", row as Record<string, unknown>);
    }
    await runSync(device.layer);

    const fewer = comboChildren();
    fewer["combo_extras"] = [];
    fewer["combo_discounts"] = [];
    server.push(
      `${JSON.stringify({ e: "combo", r: comboHeader("cb_01", 2_000, "Kopi Susu Besar"), ch: fewer })}\n`,
    );

    await runSync(device.layer);

    expect(device.db.query("SELECT combo_name FROM combos").all()).toEqual([
      { combo_name: "Kopi Susu Besar" },
    ]);
    expect(device.db.query("SELECT combo_extra_id FROM combo_extras").all()).toEqual([]);
    expect(device.db.query("SELECT combo_discount_id FROM combo_discounts").all()).toEqual([]);
  });

  test("a dangling listing reference is stored, not rejected", async () => {
    // The combo group runs after `product`, but a page may still name a listing
    // this device never received. Migration 58 drops the cross-group FK, so the
    // aggregate lands whole and the POS treats the missing component as
    // unavailable when it expands the combo.
    const server = new FakeServer();
    const device = setup(server);
    server.push(
      `${JSON.stringify({ e: "combo", r: comboHeader("cb_01", 1_000), ch: comboChildren() })}\n`,
    );

    await runSync(device.layer);

    expect(device.db.query("SELECT listing_id FROM combo_listings").all()).toEqual([
      { listing_id: "l_remote" },
    ]);
  });
});

describe("local state", () => {
  test("an edit bumps the clock strictly above the stored one", async () => {
    const device = setup();
    const future = Date.now() + 1_000_000;
    // A clock in the future, as a device with a fast clock would leave it.
    insertRow(device.db, "customer", {
      customer_id: "c_01",
      customer_name: "Ani",
      customer_phone: "",
      customer_updated_at: future,
      syncAt: 1,
    });

    const customerLayer = CustomerLive.pipe(Layer.provide(device.dbLayer));
    await Effect.runPromise(
      Effect.gen(function* () {
        const customers = yield* CustomerService;
        yield* customers.set.info("c_01", { name: "Budi", phone: "" });
      }).pipe(Effect.provide(customerLayer)),
    );

    const row = device.db
      .query(
        "SELECT customer_name, customer_updated_at, customer_sync_at FROM customers WHERE customer_id = 'c_01'",
      )
      .get() as {
      customer_name: string;
      customer_updated_at: number;
      customer_sync_at: number | null;
    };
    expect(row.customer_name).toBe("Budi");
    // §5.1.1: `max(now, stored + 1)`, so a fast clock cannot swallow the edit.
    expect(row.customer_updated_at).toBe(future + 1);
    expect(row.customer_sync_at).toBeNull();
  });

  test("an ack never overwrites an edit made while the batch was in flight", async () => {
    // §4.12 / A4: the row is edited after it was selected but before its ack is
    // applied. The ack is skipped, the row stays dirty, and the next run pushes
    // the newer version.
    let edited = false;
    const device = setup(new FakeServer(), {}, () => {
      // Every push is answered by a fresh local edit, so every ack is stale by
      // the time it is applied and the row never takes a marker.
      edited = true;
      device.db
        .query(
          "UPDATE customers SET customer_name = 'Budi', customer_updated_at = max(?, customer_updated_at + 1), customer_sync_at = NULL WHERE customer_id = 'c_01'",
        )
        .run(Date.now());
    });
    insertRow(device.db, "customer", {
      customer_id: "c_01",
      customer_name: "Ani",
      customer_phone: "",
      customer_updated_at: 1_000,
    });

    await runSync(device.layer);

    const row = device.db
      .query(
        "SELECT customer_name, customer_updated_at, customer_sync_at FROM customers WHERE customer_id = 'c_01'",
      )
      .get() as {
      customer_name: string;
      customer_updated_at: number;
      customer_sync_at: number | null;
    };
    // The local edit survived, and it is still owed to the server: no ack was
    // applied to a row that changed after it was sent.
    expect(edited).toBe(true);
    expect(row.customer_name).toBe("Budi");
    expect(row.customer_sync_at).toBeNull();
    const stored = device.server.rows.get("customer:c_01");
    expect(row.customer_updated_at).toBeGreaterThan(Number(stored?.["customer_updated_at"]));
  });

  test("a push sends only dirty rows", async () => {
    const device = setup();
    insertRow(device.db, "customer", {
      customer_id: "c_01",
      customer_name: "Ani",
      customer_phone: "",
      customer_updated_at: 1_000,
      syncAt: 42,
    });
    insertRow(device.db, "customer", {
      customer_id: "c_02",
      customer_name: "Budi",
      customer_phone: "",
      customer_updated_at: 1_000,
    });

    await runSync(device.layer);

    const names = device.server.changes.map((change) => change.row["customer_name"]);
    expect(names).toEqual(["Budi"]);
  });

  test("the bookmark is one row per group, committed with its page", async () => {
    const device = setup();
    insertRow(device.db, "customer", {
      customer_id: "c_01",
      customer_name: "Ani",
      customer_phone: "",
      customer_updated_at: 1_000,
    });

    await runSync(device.layer);

    const rows = device.db
      .query("SELECT group_name, seq FROM sync_bookmark ORDER BY group_name")
      .all() as { group_name: string; seq: number }[];
    expect(rows.find((row) => row.group_name === "customer")?.seq).toBe(1);
    // One row per group — the empty groups commit their (unchanged) bookmark too.
    expect(rows.map((row) => row.group_name)).toEqual([...SYNC_GROUPS].sort());
  });
});

// ============================================================================
// Progress (§ the one bar)
// ============================================================================

describe("progress", () => {
  /** Runs one sync while recording every state it published. */
  async function runObserved(device: ReturnType<typeof setup>): Promise<SyncState[]> {
    const seen: SyncState[] = [];
    await Effect.runPromise(
      Effect.gen(function* () {
        const sync = yield* SyncService;
        const watcher = yield* Stream.runForEach(sync.state, (state) =>
          Effect.sync(() => seen.push(state)),
        ).pipe(Effect.fork);
        yield* sync.run("sync");
        yield* Fiber.interrupt(watcher);
      }).pipe(Effect.provide(device.layer)),
    );
    return seen;
  }

  /** One `pocket`, dirty by omission of `syncAt`, plus a synced cash row. */
  function seedPockets(db: Db): void {
    insertRow(db, "pocket", {
      pocket_id: "p_01",
      pocket_name: "Kas",
      pocket_type: "absolute",
      pocket_ordering: 1,
      pocket_updated_at: 1_000,
      syncAt: 500,
    });
    insertRow(db, "money", {
      money_id: "m_01",
      timestamp: 1_000,
      money_value: 1_000,
      pocket_id: "p_01",
      money_note: "",
      money_updated_at: 1_000,
      syncAt: 500,
    });
  }

  /** What the server would answer a `push` with, as one NDJSON line. */
  function pocketFrame(id: string, name: string): string {
    return `${JSON.stringify({
      e: "pocket",
      r: wireRow("pocket", {
        pocket_id: id,
        pocket_name: name,
        pocket_type: "absolute",
        pocket_ordering: 2,
        pocket_updated_at: 1_000,
        pocket_deleted_at: null,
      }),
    })}\n`;
  }

  test("a group's bar only ever moves forward, across phases and pages", async () => {
    const device = setup();
    insertRow(device.db, "pocket", {
      pocket_id: "p_01",
      pocket_name: "Kas",
      pocket_type: "absolute",
      pocket_ordering: 1,
      pocket_updated_at: 1_000,
    });
    for (let index = 0; index < 1_200; index += 1) {
      insertRow(device.db, "money", {
        money_id: `m_${String(index).padStart(4, "0")}`,
        timestamp: 1_000 + index,
        money_value: 1_000 + index,
        pocket_id: "p_01",
        money_note: "",
        money_updated_at: 1_000,
      });
    }

    const progress: number[] = [];
    await Effect.runPromise(
      Effect.gen(function* () {
        const sync = yield* SyncService;
        const watcher = yield* Stream.runForEach(sync.state, (state) =>
          Effect.sync(() => {
            const value = state.groups.find((entry) => entry.group === "money")?.progress;
            if (typeof value === "number") progress.push(value);
          }),
        ).pipe(Effect.fork);
        yield* sync.run("sync");
        yield* Fiber.interrupt(watcher);
      }).pipe(Effect.provide(device.layer)),
    );

    expect(progress.length).toBeGreaterThan(3);
    for (let index = 1; index < progress.length; index += 1) {
      expect(progress[index]!).toBeGreaterThanOrEqual(progress[index - 1]!);
    }
    expect(progress[progress.length - 1]).toBe(1);
  });

  test("the closing pull is its own phase, and the bar never reads 100% during it", async () => {
    // The third stage of the cycle is another pull (§9.2), and it used to publish
    // itself as one: the bar sat at 100% — the settle slice was five units out of
    // thousands, which rounds to nothing — next to the word "Mengunduh", after this
    // device had already finished uploading. On a first sync that stage walks the
    // whole catalogue it just sent, so it read as a hung download.
    const device = setup();
    seedPockets(device.db);
    device.server.push(pocketFrame("p_02", "Bank"));
    for (let index = 0; index < 40; index += 1) {
      insertRow(device.db, "money", {
        money_id: `m_${String(index).padStart(4, "0")}`,
        timestamp: 2_000 + index,
        money_value: 1_000 + index,
        pocket_id: "p_01",
        money_note: "",
        money_updated_at: 1_000,
      });
    }

    const seen = await runObserved(device);
    const money = seen.map((state) => state.groups.find((entry) => entry.group === "money")!);
    const settle = money.filter((entry) => entry.phase === "settle");

    expect(settle.length).toBeGreaterThan(0);
    for (const entry of settle) {
      // The bar holds a visible slice for this phase, so it has not filled yet.
      expect(entry.progress ?? 1).toBeLessThan(1);
      // And the caption says what is happening: a check, not a download.
      expect(entry.message).toBe("Memeriksa perubahan lain…");
    }
    // The slice is not a rounding error either — a shop watching the dialog can see
    // the bar sitting short of the end while this phase runs.
    expect((settle[0]?.progress ?? 1) * 100).toBeLessThanOrEqual(99);
  });

  test("a run that is almost all push does not spend its bar on the pull", async () => {
    const device = setup();
    seedPockets(device.db);
    // One change waiting on the server, and three hundred rows this device owes
    // it — a normal day at a till, and the shape that used to jump the bar to 60%
    // at the phase boundary and crawl from there.
    device.server.push(pocketFrame("p_02", "Bank"));
    for (let index = 0; index < 300; index += 1) {
      insertRow(device.db, "money", {
        money_id: `m_${String(index).padStart(4, "0")}`,
        timestamp: 2_000 + index,
        money_value: 1_000 + index,
        pocket_id: "p_01",
        money_note: "",
        money_updated_at: 1_000,
      });
    }

    const seen = await runObserved(device);
    const money = seen.map((state) => state.groups.find((entry) => entry.group === "money")!);

    // The pull's own share of the bar: everything published while pulling, before
    // the first push tick. (The closing pull reports as `pull` too, which is why
    // this is a range and not a filter.)
    const firstPush = money.findIndex((entry) => entry.phase === "push");
    expect(firstPush).toBeGreaterThan(0);
    const lastPull = money.slice(0, firstPush).at(-1);
    expect(lastPull?.progress ?? 0).toBeLessThan(0.05);
    // The push starts where the pull ended — no cliff, no 60% plateau.
    expect(money[firstPush]?.progress ?? 1).toBeLessThan(0.1);
    expect(money.at(-1)?.progress).toBe(1);
  });

  test("the byte counters add up what crossed, in both directions", async () => {
    const device = setup();
    seedPockets(device.db);
    device.server.push(pocketFrame("p_02", "Bank"));
    insertRow(device.db, "money", {
      money_id: "m_02",
      timestamp: 2_000,
      money_value: 2_500,
      pocket_id: "p_01",
      money_note: "",
      money_updated_at: 2_000,
    });

    const seen = await runObserved(device);
    const money = seen.at(-1)?.groups.find((entry) => entry.group === "money");
    const transfer = money?.transfer;
    expect(transfer).toBeDefined();
    if (transfer === undefined) return;

    // Both directions carried the pocket's and the money row's JSON.
    expect(transfer.down.bytes).toBeGreaterThan(0);
    expect(transfer.up.bytes).toBeGreaterThan(0);
    // A finished pass has nothing left to size, so it states no total at all — the
    // screen shows a bare byte count rather than a denominator it would have to
    // invent. (A row pass never had a byte total to offer: a page says how many
    // changes it holds, not how big they are.)
    expect(transfer.down.total).toBeNull();
    expect(transfer.up.total).toBeNull();
  });

  test("a total is only ever known work, never a projection that grows", async () => {
    // The reported shape: a first upload, where the early batches are cheap rows and
    // the later ones are not. The old total was "average row size × rows owed", so it
    // *rose* with every batch that carried bigger rows, and being clamped upward it
    // could never come back down: a denominator that grew the longer the sync ran.
    const device = setup();
    for (let index = 0; index < 900; index += 1) {
      insertRow(device.db, "product", {
        product_id: `P${String(index).padStart(4, "0")}`,
        product_name: `Barang ${index}`,
        product_note: index < 500 ? "" : "x".repeat(600),
        product_flag: 0,
        product_updated_at: 1_000,
      });
    }

    const seen = await runObserved(device);
    const product = seen.map((state) => state.groups.find((entry) => entry.group === "product")!);

    for (const entry of product) {
      const { up } = entry.transfer;
      // A total, when present, is where the running pass ends — never below what has
      // already crossed.
      if (up.total !== null) expect(up.total).toBeGreaterThanOrEqual(up.bytes);
    }
    // And nothing here ever claimed a total for a row pass.
    expect(product.every((entry) => entry.transfer.up.total === null)).toBe(true);
  });
});

// ============================================================================
// Paging: neither direction stops on a count
// ============================================================================
//
// Both loops were bounded by a pass count instead of by the work left, and both
// were silent about it: a first upload stopped at `5 × 1000` frames, and a pull
// stopped as soon as its page came back short. The shape of that bug is a shop
// that synced and ended up with exactly 5000 of every group on the other device,
// with both runs reporting success.

describe("paging", () => {
  test("a first upload larger than five batches does not stop at five", async () => {
    const device = setup();
    // 6000 dirty rows: five batches of 1000 is 5000, which is exactly the shape
    // of the reported "I only got 5000" — a first upload must not stop on a pass
    // count while rows are still owed.
    for (let index = 0; index < 6_000; index += 1) {
      insertRow(device.db, "product", {
        product_id: `P${String(index).padStart(6, "0")}`,
        product_name: `Barang ${index}`,
        product_note: "",
        product_flag: 0,
        product_updated_at: 1_000,
      });
    }

    const report = await runSync(device.layer);

    expect(report.groups.product.pushed).toBe(6_000);
    // Nothing is left owing, so the run is allowed to call itself finished.
    expect(report.groups.product.remaining).toBe(0);
    expect(report.remaining).toBe(0);
    const unsynced = device.db
      .query("SELECT COUNT(*) AS total FROM products WHERE product_sync_at IS NULL")
      .get() as { total: number };
    expect(unsynced.total).toBe(0);
  });

  test("a pull that needs more than one page keeps asking", async () => {
    const device = setup();
    // 5000 is the money group's page size, so 6000 looks exactly like the
    // clamped-to-one-page bug: the second page must happen, and everything must
    // land.
    const body = Array.from({ length: 6_000 }, (_, index) =>
      JSON.stringify({
        e: "money",
        r: wireRow("money", {
          money_id: `m_${String(index).padStart(5, "0")}`,
          timestamp: 1_000 + index,
          money_value: 1_000 + index,
          pocket_id: "p_01",
          money_note: "",
          money_updated_at: 1_000,
          money_deleted_at: null,
        }),
      }),
    ).join("\n");
    device.server.push(
      `${JSON.stringify({
        e: "pocket",
        r: wireRow("pocket", {
          pocket_id: "p_01",
          pocket_name: "Kas",
          pocket_type: "absolute",
          pocket_ordering: 1,
          pocket_updated_at: 1_000,
          pocket_deleted_at: null,
        }),
      })}\n${body}\n`,
    );

    await runSync(device.layer);

    const money = device.db.query("SELECT COUNT(*) AS total FROM money").get() as { total: number };
    expect(money.total).toBe(6_000);
    // One page at the 5000 size, then one from where it stopped — and the closing
    // pull after the push, from the bookmark that second page left.
    const pages = device.server.pulls
      .filter((pull) => pull.group === "money")
      .map((pull) => pull.after);
    expect(pages.slice(0, 2)).toEqual([0, 5_000]);
    // 6001: the pocket holds seq 1, so the last money row is seq 6001, and the
    // closing pull starts from the bookmark the second page committed.
    expect(pages.at(-1)).toBe(6_001);
  });
});

// ============================================================================
// The one-product manual sync (`SYNC-V2-ONE-PRODUCT.md`)
// ============================================================================

function runProductSync(
  layer: Layer.Layer<SyncService>,
  productId: string,
): Promise<import(".").OneProductReport> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const sync = yield* SyncService;
      return yield* sync.syncProduct(productId);
    }).pipe(Effect.provide(layer)),
  );
}

function insertProduct(db: Db, id: string, name: string, updatedAt: number): void {
  insertRow(db, "product", {
    product_id: id,
    product_name: name,
    product_note: "",
    product_flag: 0,
    product_updated_at: updatedAt,
  });
}

function insertListing(
  db: Db,
  id: string,
  productId: string,
  name: string,
  updatedAt: number,
): void {
  insertRow(db, "listing", {
    listing_id: id,
    product_id: productId,
    listing_name: name,
    listing_price: 1000,
    listing_unit: 1,
    listing_kind: "",
    listing_code: null,
    listing_updated_at: updatedAt,
  });
}

function insertEvent(db: Db, id: string, productId: string): void {
  insertRow(db, "product_event", {
    product_event_id: id,
    product_event_created_at: 1500,
    product_event_value: 5,
    product_event_capital: 500,
    product_event_note: "",
    product_id: productId,
    stock_id: null,
    record_id: null,
  });
}

describe("one-product sync", () => {
  test("pushes only the selected product and pulls its whole baggage", async () => {
    const server = new FakeServer();
    const first = setup(server);
    insertProduct(first.db, "P1", "Kopi", 1_000);
    insertListing(first.db, "L1", "P1", "250ml", 1_000);
    insertEvent(first.db, "E1", "P1");
    insertProduct(first.db, "P2", "Teh", 1_000);
    insertListing(first.db, "L2", "P2", "1L", 1_000);

    const report = await runProductSync(first.layer, "P1");
    expect(report.pushed).toBe(3);
    expect(report.pulled).toBe(3);

    // The selected product's rows are on the server and marked synced.
    const pushed = [...server.rows.entries()]
      .filter(([, row]) => row["product_id"] === "P1")
      .map(([key]) => key)
      .sort();
    expect(pushed).toEqual(["listing:L1", "product:P1", "product_event:E1"]);
    for (const table of ["products", "listings", "product_events"]) {
      expect(
        first.db
          .query(
            `SELECT COUNT(*) AS n FROM ${table} WHERE product_id = 'P1' AND ${table.slice(0, -1)}_sync_at IS NULL`,
          )
          .get(),
      ).toEqual({ n: 0 });
    }

    // Another product is untouched by both directions.
    expect(server.rows.has("product:P2")).toBe(false);
    expect(
      first.db.query("SELECT product_sync_at FROM products WHERE product_id = 'P2'").get(),
    ).toEqual({ product_sync_at: null });

    // A fresh device receives the snapshot and records the server seqs.
    const second = setup(server);
    const pulled = await runProductSync(second.layer, "P1");
    expect(pulled.pushed).toBe(0);
    expect(pulled.pulled).toBe(3);
    expect(
      second.db.query("SELECT product_name FROM products WHERE product_id = 'P1'").get(),
    ).toEqual({ product_name: "Kopi" });
    expect(
      second.db.query("SELECT COUNT(*) AS n FROM listings WHERE product_id = 'P1'").get(),
    ).toEqual({ n: 1 });
    expect(
      second.db.query("SELECT product_sync_at FROM products WHERE product_id = 'P1'").get(),
    ).toEqual({ product_sync_at: 1 });
  });

  test("never moves the product group's bookmark", async () => {
    const device = setup();
    insertRow(device.db, "pocket", {
      pocket_id: "p_01",
      pocket_name: "Kas",
      pocket_type: "absolute",
      pocket_ordering: 1,
      pocket_updated_at: 1_000,
    });
    insertProduct(device.db, "P1", "Kopi", 1_000);

    // A full cycle establishes a non-zero bookmark for the product group.
    await runSync(device.layer);
    const before = await Effect.runPromise(
      Effect.gen(function* () {
        const sync = yield* SyncService;
        return yield* sync.cursor("product");
      }).pipe(Effect.provide(device.layer)),
    );
    expect(before).toBeGreaterThan(0);

    insertListing(device.db, "L1", "P1", "250ml", 2_000);
    await runProductSync(device.layer, "P1");

    const after = await Effect.runPromise(
      Effect.gen(function* () {
        const sync = yield* SyncService;
        return yield* sync.cursor("product");
      }).pipe(Effect.provide(device.layer)),
    );
    expect(after).toBe(before);
  });

  test("a scoped pull repairs an older local row from the server", async () => {
    const server = new FakeServer();
    const writer = setup(server);
    insertProduct(writer.db, "P1", "Server Name", 5_000);
    await runProductSync(writer.layer, "P1");

    const reader = setup(server);
    insertProduct(reader.db, "P1", "Local Name", 1_000);
    const report = await runProductSync(reader.layer, "P1");
    expect(report.pulled).toBeGreaterThan(0);
    expect(
      reader.db.query("SELECT product_name FROM products WHERE product_id = 'P1'").get(),
    ).toEqual({ product_name: "Server Name" });
  });
});

// ============================================================================
// Automatic sync (§9.10)
//
// The scheduler lives inside the service, so these drive it the way the app does
// — `arm` once at boot, then let the triggers arrive — and assert on the runs it
// produced rather than on the fibers it forked. Everything happens inside **one**
// provided effect: a layer is built per `runPromise`, so a scenario spread across
// several calls would get a fresh service each time and no scheduler at all.
// ============================================================================

type Sync = Context.Tag.Service<typeof SyncService>;

/** The run state as a subscriber sees it (a `SubscriptionRef` replays the current value). */
function readState(sync: Sync): Effect.Effect<SyncState> {
  return Stream.runHead(sync.state).pipe(Effect.map((head) => Option.getOrThrow(head)));
}

/** Polls the state until `done` holds, or dies after `timeoutMs`. */
function until(
  sync: Sync,
  done: (state: SyncState) => boolean,
  timeoutMs = 8_000,
): Effect.Effect<SyncState> {
  return Effect.gen(function* () {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const state = yield* readState(sync);
      if (done(state)) return state;
      yield* Effect.sleep("50 millis");
    }
    return yield* Effect.die(new Error("auto sync: timed out waiting for a state"));
  });
}

/** Polls the schedule until `done` holds — for a deadline a fiber sets, not a state. */
function untilAuto(
  sync: Sync,
  done: (state: AutoSyncState) => boolean,
  timeoutMs = 8_000,
): Effect.Effect<AutoSyncState> {
  return Effect.gen(function* () {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const state = yield* sync.auto.get();
      if (done(state)) return state;
      yield* Effect.sleep("50 millis");
    }
    return yield* Effect.die(new Error("auto sync: timed out waiting for a schedule"));
  });
}

describe("automatic sync", () => {
  test("the master switch runs a cycle on open and schedules the next one", async () => {
    const device = setup(new FakeServer(), {
      "sync.auto": { enabled: true, interval: true, everyMinutes: 5, editGroups: [] },
    });

    const outcome = await Effect.runPromise(
      Effect.gen(function* () {
        const sync = yield* SyncService;
        // A till that was closed overnight: the switch alone has to catch it up.
        yield* sync.auto.arm();
        const finished = yield* until(sync, (state) => state.status === "done");
        // The timer arms its deadline from the end of that cycle, which is a
        // quarter-second poll after the state said "done".
        const auto = yield* untilAuto(sync, (state) => state.nextAt !== null);
        return { finished, auto };
      }).pipe(Effect.provide(device.layer)),
    );

    expect(outcome.finished.report).not.toBeNull();
    expect(outcome.auto.auto.enabled).toBe(true);
    // The deadline is one interval from the end of that cycle, not from boot: a
    // slow connection must not make the next run arrive early.
    expect(outcome.auto.nextAt).not.toBeNull();
    const wait = outcome.auto.nextAt! - outcome.finished.finishedAt!;
    expect(wait).toBeGreaterThan(4 * 60_000);
    expect(wait).toBeLessThanOrEqual(5 * 60_000 + 2_000);
  }, 15_000);

  test("a write in an enabled group starts a cycle", async () => {
    const device = setup(new FakeServer(), {
      "sync.auto": { enabled: true, interval: false, everyMinutes: 5, editGroups: ["customer"] },
    });

    const runs = await Effect.runPromise(
      Effect.gen(function* () {
        const sync = yield* SyncService;
        yield* sync.auto.arm();
        const first = yield* until(sync, (state) => state.status === "done");
        // Exactly what `customer/live.ts` does after a commit.
        yield* PubSub.publish(device.bus, "customer");
        const second = yield* until(
          sync,
          (state) => state.status === "done" && (state.startedAt ?? 0) > (first.startedAt ?? 0),
        );
        return { first, second };
      }).pipe(Effect.provide(device.layer)),
    );

    expect(runs.second.startedAt!).toBeGreaterThan(runs.first.startedAt!);
  }, 15_000);

  test("a write in a group that is switched off starts nothing", async () => {
    const device = setup(new FakeServer(), {
      "sync.auto": { enabled: true, interval: false, everyMinutes: 5, editGroups: [] },
    });

    const outcome = await Effect.runPromise(
      Effect.gen(function* () {
        const sync = yield* SyncService;
        yield* sync.auto.arm();
        const first = yield* until(sync, (state) => state.status === "done");
        yield* PubSub.publish(device.bus, "customer");
        // Longer than the debounce window, so a cycle would already be running.
        yield* Effect.sleep("2500 millis");
        return { first, after: yield* readState(sync) };
      }).pipe(Effect.provide(device.layer)),
    );

    expect(outcome.after.status).toBe("done");
    expect(outcome.after.startedAt).toBe(outcome.first.startedAt);
  }, 15_000);

  test("nothing runs automatically without a token", async () => {
    const server = new FakeServer();
    const device = setup(server, {
      "sync.token": "",
      "sync.auto": { enabled: true, interval: false, everyMinutes: 5, editGroups: ["customer"] },
    });

    const state = await Effect.runPromise(
      Effect.gen(function* () {
        const sync = yield* SyncService;
        yield* sync.auto.arm();
        yield* PubSub.publish(device.bus, "customer");
        yield* Effect.sleep("2500 millis");
        return yield* readState(sync);
      }).pipe(Effect.provide(device.layer)),
    );

    // Silent, not a red pill every interval: an unconfigured till is Settings'
    // problem, and that screen already says so next to the buttons.
    expect(state.status).toBe("idle");
    expect(state.finishedAt).toBeNull();
    expect(server.pulls).toHaveLength(0);
  }, 15_000);

  test("the switch saves to the store and re-arms the timer", async () => {
    const device = setup(new FakeServer(), {});

    const outcome = await Effect.runPromise(
      Effect.gen(function* () {
        const sync = yield* SyncService;
        yield* sync.auto.arm();
        const before = yield* sync.auto.get();
        // What the panel does when a dot is picked.
        const after = yield* sync.auto.set({ enabled: true, everyMinutes: 1 });
        // Switching it on runs a cycle immediately, and the interval only starts
        // once that run is done — so the deadline is what has to be waited for.
        const stored = yield* untilAuto(sync, (state) => state.nextAt !== null);
        return { before, after, stored };
      }).pipe(Effect.provide(device.layer)),
    );

    // Off by default: the schedule is opt-in.
    expect(outcome.before.auto.enabled).toBe(false);
    expect(outcome.after.auto).toEqual({
      enabled: true,
      interval: true,
      everyMinutes: 1,
      editGroups: SYNC_GROUPS.slice(),
    });
    // Written through, so a restart resumes the same schedule.
    expect(device.entries.get("sync.auto")).toEqual(outcome.stored.auto);
    expect(outcome.stored.nextAt).not.toBeNull();
  }, 15_000);
});
