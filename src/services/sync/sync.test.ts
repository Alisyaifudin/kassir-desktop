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
import { Effect, Fiber, Layer, Option, Stream } from "effect";
import { makeTestDatabase } from "../db/test-support";
import { CustomerService } from "../customer";
import { CustomerLive } from "../customer/live";
import { ExtraLive } from "../extra/live";
import { MethodLive } from "../method/live";
import { MoneyLive } from "../money/live";
import { ProductLive } from "../product/live";
import { RecordLive } from "../record/live";
import { SocialLive } from "../social/live";
import { makeTestStore } from "../store/test-support";
import { SupplierLive } from "../supplier/live";
import { SYNC_GROUPS, SyncService, type SyncReport } from ".";
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
    if (change.entity === "record" && change.children !== undefined) {
      this.children.set(idOf(TABLES["record"]!, change.row), change.children);
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
      const children = GROUPS.record.children;
      if (children === undefined) throw new Error("record has no children");
      const storedChildren = this.children.get(id) ?? emptyChildren();
      const decision = decideAggregate(def, children, stored, storedChildren, row, ch ?? emptyChildren());
      if (decision === "noop") return { s: "noop", seq: this.seqOf(entity, id) };
      if (decision === "stale") {
        return { s: "stale", seq: this.seqOf(entity, id), row: stored, ch: storedChildren };
      }
      return { s: "applied", seq: this.store({ entity, row, children: ch ?? emptyChildren() }) };
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

  /** §3.2: `meta`, the group's changes in `(after, snapshot]`, then `done`. */
  pull(group: string, after: number, limit: number): string[] {
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
    return [
      JSON.stringify({ t: "meta", snapshot }),
      ...page.map((change) =>
        change.entity === "record"
          ? JSON.stringify({
              t: "ag",
              s: change.seq,
              e: change.entity,
              r: change.row,
              ch: change.children ?? emptyChildren(),
            })
          : JSON.stringify({ t: "row", s: change.seq, e: change.entity, r: change.row }),
      ),
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

  const transport: SyncTransport = {
    health() {
      return Promise.resolve({ status: 200, message: "ok" });
    },
    pull(_endpoint, input) {
      try {
        return lineStream(server.pull(input.group, input.after, input.limit));
      } catch (error) {
        return failedStream(error);
      }
    },
    push(_endpoint, input) {
      beforePush?.();
      return lineStream(server.push(input.body));
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
    // One transaction, like `sync_merge` in Rust: a page either lands whole or
    // not at all.
    merge(statements) {
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
  const productLayer = ProductLive.pipe(Layer.provide(dbLayer));
  const recordLayer = RecordLive.pipe(Layer.provide(dbLayer), Layer.provide(productLayer));
  const transportLayer = Layer.succeed(SyncTransportService, transport);
  const appLayer = SyncLive.pipe(
    Layer.provide(
      Layer.mergeAll(
        dbLayer,
        storeLayer,
        transportLayer,
        moneyLayer,
        customerLayer,
        supplierLayer,
        methodLayer,
        socialLayer,
        extraLayer,
        productLayer,
        recordLayer,
      ),
    ),
  );

  return { db, dbLayer, entries, storeLayer, server, layer: appLayer };
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
  const bindings = [...def.columns.map((column) => values[column] ?? null), values["syncAt"] ?? null];
  db.query(
    `INSERT INTO ${def.table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
  ).run(...(bindings as (string | number | null)[]));
}

/** Inserts a record child; `record_id` is inherited, never a wire column. */
function insertChild(
  db: Db,
  key: string,
  recordId: string,
  values: Record<string, unknown>,
): void {
  const child = GROUPS.record.children?.find((entry) => entry.key === key);
  if (child === undefined) throw new Error(`unknown child ${key}`);
  const columns = ["record_id", ...child.columns];
  const bindings = [recordId, ...child.columns.map((column) => values[column] ?? null)];
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
  const child = GROUPS.record.children?.find((entry) => entry.key === key);
  if (child === undefined) throw new Error(`unknown child ${key}`);
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
    expect(sameAggregate(def, children, recordHeader("r_01", 10), ch, recordHeader("r_01", 10), reversed)).toBe(true);
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
    expect(
      parsePullFrame("customer", { t: "row", s: 2, e: "nope", r: {} }),
    ).toBeNull();
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
      `${JSON.stringify({ e: "pocket", r: wireRow("pocket", {
        pocket_id: "p_02",
        pocket_name: "Bank",
        pocket_type: "absolute",
        pocket_ordering: 2,
        pocket_updated_at: 1_000,
        pocket_deleted_at: null,
      }) })}\n`,
    );

    await runSync(device.layer);

    // Nothing was deleted; the refused row was kept and re-uploaded, and the
    // server's own pocket was pulled.
    const names = device.db
      .query("SELECT pocket_name FROM pockets ORDER BY pocket_name")
      .all() as { pocket_name: string }[];
    expect(names.map((row) => row.pocket_name)).toEqual(["Bank", "Kas"]);
    // The table is authoritative now; the legacy store key is never read again.
    expect(
      device.db.query("SELECT seq FROM sync_bookmark WHERE group_name = 'money'").get(),
    ).toBeDefined();
  });

  test("a 410 re-seeds from the floor, never from zero", async () => {
    const device = setup();
    // Two server changes, then the floor moves past the device's bookmark.
    device.server.push(
      `${JSON.stringify({ e: "customer", r: customer("c_01", "Ani", 1_000) })}\n`,
    );
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
    const parked = device.db
      .query("SELECT money_id, seq FROM sync_parked_money")
      .all() as { money_id: string; seq: number }[];
    expect(parked).toEqual([{ money_id: "m_09", seq: 1 }]);

    device.server.push(
      `${JSON.stringify({ e: "pocket", r: wireRow("pocket", {
        pocket_id: "p_01",
        pocket_name: "Kas",
        pocket_type: "absolute",
        pocket_ordering: 1,
        pocket_updated_at: 1_000,
        pocket_deleted_at: null,
      }) })}\n`,
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
    const device = setup(
      new FakeServer(),
      {},
      () => {
        // Every push is answered by a fresh local edit, so every ack is stale by
        // the time it is applied and the row never takes a marker.
        edited = true;
        device.db
          .query(
            "UPDATE customers SET customer_name = 'Budi', customer_updated_at = max(?, customer_updated_at + 1), customer_sync_at = NULL WHERE customer_id = 'c_01'",
          )
          .run(Date.now());
      },
    );
    insertRow(device.db, "customer", {
      customer_id: "c_01",
      customer_name: "Ani",
      customer_phone: "",
      customer_updated_at: 1_000,
    });

    await runSync(device.layer);

    const row = device.db
      .query("SELECT customer_name, customer_updated_at, customer_sync_at FROM customers WHERE customer_id = 'c_01'")
      .get() as { customer_name: string; customer_updated_at: number; customer_sync_at: number | null };
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
});
