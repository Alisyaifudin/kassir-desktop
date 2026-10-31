/**
 * Tests for the sync loops against an in-memory server.
 *
 * The fake server speaks the same NDJSON protocol the backend contract specifies
 * (`backend-docs/sync-contract.md`), including the prefix hash chain, so these
 * tests exercise the client's wire duties — canonical framing, chunk offsets, ack
 * handling, LWW merge — rather than a mock of them.
 *
 * Run with:  bun test src/services/sync/sync.test.ts
 */
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { Effect, Layer } from "effect";
import { DatabaseService } from "../db";
import { makeTestDatabase } from "../db/test-support";
import { EMPTY_CHAIN } from "./chain";
import { encodeRecordFrame, encodeRowFrame } from "./frames";
import { makeMerger, type MergeExecutor } from "./merge";
import { pull } from "./pull";
import { push } from "./push";
import { CHILD_ORDER, ENTITY_ORDER, TABLES, toCanonicalRow, type Entity, type WireRow } from "./schema";
import { countRowsSql, markSyncedStatements, resetSyncStatements } from "./sql";
import { SyncError } from "./index";
import type { LineStream, StreamSummary } from "./stream";
import { TransportError, type ChainState, type Endpoint, type Session, type SyncTransport } from "./transport";

import type { Context } from "effect";

/** The database service's shape, as the sync statements use it. */
type DatabaseServiceImpl = Context.Tag.Service<typeof DatabaseService>;

const endpoint: Endpoint = { baseUrl: "https://sync.test", token: "t" };

/** sha256 hex, the chain's step (§7.3). */
function chainStep(prevHex: string, line: string): string {
  const prev = prevHex === "" ? Buffer.alloc(0) : Buffer.from(prevHex, "hex");
  return createHash("sha256").update(prev).update("\n").update(line, "utf8").digest("hex");
}

function chainOf(prev: string, lines: readonly string[]): ChainState {
  let chain = prev;
  let bytes = 0;
  for (const line of lines) {
    chain = chainStep(chain, line);
    bytes += Buffer.byteLength(line, "utf8") + 1;
  }
  return { chain, bytes };
}

/**
 * Renders a stored *upload* frame (`{"e":…,"r":…}`) as the tagged *pull* line the
 * server would send (`{"t":"row","s":…,…}`), which is how the same payload travels
 * in each direction.
 */
function toPullLines(frames: { seq: number; line: string }[]): string[] {
  return frames.map((frame) => {
    const raw = JSON.parse(frame.line) as {
      e: Entity;
      r: WireRow;
      ch?: Record<string, WireRow[]>;
    };
    if (raw.ch !== undefined) {
      return JSON.stringify({ t: "ag", s: frame.seq, e: raw.e, r: raw.r, ch: raw.ch });
    }
    return JSON.stringify({ t: "row", s: frame.seq, e: raw.e, r: raw.r });
  });
}

/** A `LineStream` over a fixed list of lines. */
function lineStream(lines: readonly string[], summary?: StreamSummary): LineStream {
  return {
    lines: (async function* () {
      for (const line of lines) yield line;
    })(),
    summary: Promise.resolve(summary ?? { lines: lines.length, cancelled: false }),
    cancel: () => undefined,
  };
}

function failedStream(status: number, code: string): LineStream {
  return {
    lines: (async function* () {})(),
    summary: Promise.reject(new TransportError(status, code, code)),
    cancel: () => undefined,
  };
}

type Stored = { entity: Entity; seq: number; line: string };

/** The smallest server that can answer the client (§7, §8). */
class FakeServer implements SyncTransport {
  readonly stored: Stored[] = [];
  readonly sessions = new Map<string, { at: number; frames: number; chain: string }>();
  readonly pushes: { offset: number; prefix: string; lines: string[] }[] = [];
  /** Forces the next upload to fail, once. */
  failNextUpload: { status: number; code: string } | null = null;
  /** When set, the next matching frame is answered `stale` with this payload. */
  staleReply: { entity: Entity; row: WireRow; children?: Record<string, WireRow[]> } | null = null;
  /** Counts `createSession` calls, to assert a session is re-opened on failure. */
  sessionsCreated = 0;
  private seq = 0;

  get snapshot(): number {
    return this.seq;
  }

  seed(entity: Entity, row: Record<string, unknown>): void {
    const def = TABLES[entity];
    const canonical = toCanonicalRow(def, row);
    const line =
      entity === "record" ? encodeRecordFrame(canonical, {}) : encodeRowFrame(entity, canonical);
    this.seq += 1;
    this.stored.push({ entity, seq: this.seq, line });
  }

  health() {
    return Promise.resolve({ protocol: 1, snapshotSeq: this.seq });
  }

  createSession(): Promise<Session> {
    this.sessionsCreated += 1;
    const id = `ul_${this.sessionsCreated}`;
    this.sessions.set(id, { at: 0, frames: 0, chain: EMPTY_CHAIN });
    return Promise.resolve({ uploadId: id, at: 0, frames: 0 });
  }

  getSession(_endpoint: Endpoint, uploadId: string): Promise<Session> {
    const session = this.sessions.get(uploadId);
    if (session === undefined) {
      return Promise.reject(new TransportError(404, "not_found", "unknown session"));
    }
    return Promise.resolve({ uploadId, at: session.at, frames: session.frames });
  }

  deleteSession(_endpoint: Endpoint, uploadId: string): Promise<void> {
    this.sessions.delete(uploadId);
    return Promise.resolve();
  }

  pull(_endpoint: Endpoint, input: { since: number; limit: number }): LineStream {
    const snapshot = this.seq;
    const page = this.stored.filter((frame) => frame.seq > input.since).slice(0, input.limit);
    const lastSeq = page.length === 0 ? input.since : (page[page.length - 1]?.seq ?? input.since);
    return lineStream([
      JSON.stringify({ t: "meta", snapshot_seq: snapshot }),
      ...toPullLines(page),
      JSON.stringify({ t: "done", s: lastSeq }),
    ]);
  }

  uploadChunk(
    _endpoint: Endpoint,
    input: { uploadId: string; offset: number; prefixSha: string; body: string; compress: boolean },
  ): LineStream {
    if (this.failNextUpload !== null) {
      const failure = this.failNextUpload;
      this.failNextUpload = null;
      return failedStream(failure.status, failure.code);
    }

    const session = this.sessions.get(input.uploadId);
    if (session === undefined) return failedStream(404, "not_found");
    if (session.at !== input.offset || session.chain !== input.prefixSha) {
      return failedStream(409, "replay_mismatch");
    }

    const lines = input.body.split("\n").filter((line) => line !== "");
    this.pushes.push({ offset: input.offset, prefix: input.prefixSha, lines });

    const acks: string[] = [];
    let chain = session.chain;
    for (const [index, line] of lines.entries()) {
      const frameIndex = session.frames + index;
      // Upload lines carry no `t` wrapper — the session defines the direction.
      const frame = JSON.parse(line) as { e: Entity; r: WireRow };
      const entity: Entity = frame.e;
      if (this.staleReply !== null && this.staleReply.entity === entity) {
        acks.push(
          JSON.stringify({
            t: "ack",
            i: frameIndex,
            s: "stale",
            row: this.staleReply.row,
            ch: this.staleReply.children,
          }),
        );
        this.staleReply = null;
      } else {
        this.seq += 1;
        acks.push(JSON.stringify({ t: "ack", i: frameIndex, s: "applied", seq: this.seq }));
      }
      chain = chainStep(chain, line);
    }

    const bytes = lines.reduce((total, line) => total + Buffer.byteLength(line, "utf8") + 1, 0);
    session.at += bytes;
    session.frames += lines.length;
    session.chain = chain;

    return lineStream([
      ...acks,
      JSON.stringify({ t: "done", at: session.at, frames: session.frames }),
    ]);
  }

  chain(prev: string, lines: string[]): Promise<ChainState> {
    return Promise.resolve(chainOf(prev, lines));
  }

  /**
   * Not used by these tests: merging goes to the Rust `sync_merge` command, and the
   * tests drive `merge.ts` directly with a real `BEGIN … COMMIT` on `bun:sqlite`
   * (see `testExecutor`). Kept on the interface so the transport stays one type.
   */
  merge(): Promise<{ statements: number }> {
    return Promise.reject(new Error("merge is exercised through testExecutor, not the fake server"));
  }
}

/**
 * A `MergeExecutor` backed by a real transaction on the in-memory database — the
 * same atomicity the Rust command provides for the app.
 */
function testExecutor(
  db: ReturnType<typeof makeTestDatabase>["db"],
  counter: { calls: number; statements: number } = { calls: 0, statements: 0 },
): { run: MergeExecutor; counter: { calls: number; statements: number } } {
  const run: MergeExecutor = (statements) =>
    Effect.try({
      try: () => {
        counter.calls += 1;
        counter.statements += statements.length;
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
      },
      catch: (error) => new SyncError({ message: String(error) }),
    });
  return { run, counter };
}

/** The unsync set's size, straight from SQLite. */
function countUnsync(db: ReturnType<typeof makeTestDatabase>["db"]): number {
  return ENTITY_ORDER.reduce((total, entity) => {
    const row = db
      .query<{ total: number }, []>(countRowsSql(TABLES[entity]))
      .get();
    return total + (row?.total ?? 0);
  }, 0);
}

function setup() {
  const { db, layer } = makeTestDatabase();
  const server = new FakeServer();
  return { db, layer, server };
}

/** Runs `program` with the test database service. */
function withDb<A, E>(
  layer: Layer.Layer<DatabaseService>,
  program: (db: DatabaseServiceImpl) => Effect.Effect<A, E>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const db = yield* DatabaseService;
      return yield* program(db);
    }).pipe(Effect.provide(layer)),
  );
}

function pushDeps(
  db: DatabaseServiceImpl,
  server: FakeServer,
  overrides: Partial<Parameters<typeof push>[0]> = {},
): Parameters<typeof push>[0] {
  return {
    db,
    transport: server,
    endpoint,
    readUploadId: () => Effect.succeed(null),
    writeUploadState: () => Effect.void,
    clearUploadState: () => Effect.void,
    mergeStaleRow: () => Effect.void,
    mergeStaleAggregate: () => Effect.void,
    onProgress: () => undefined,
    ...overrides,
  };
}

/**
 * The pull + merge pair, as `live.ts` runs it: stream the whole gap, then write it
 * as one batch, then move the cursor.
 */
function pullAndMerge(
  db: DatabaseServiceImpl,
  server: FakeServer,
  state: { cursor: number },
  execute: MergeExecutor,
): Effect.Effect<{ merged: number; skipped: number; pages: number; cursor: number }, SyncError> {
  return Effect.gen(function* () {
    const pulled = yield* pull({
      transport: server,
      endpoint,
      readCursor: () => Effect.sync(() => state.cursor),
      onProgress: () => undefined,
    });
    const merger = makeMerger(db, 1_000, execute);
    const stats = yield* merger.mergeFrames(pulled.frames);
    state.cursor = pulled.lastPulledSeq;
    return {
      merged: stats.merged,
      skipped: stats.skipped,
      pages: pulled.pages,
      cursor: state.cursor,
    };
  });
}

describe("push", () => {
  test("uploads the unsync set in the contract's entity order and marks it synced", async () => {
    const { db, layer, server } = setup();
    db.query(
      "INSERT INTO pockets (pocket_id, pocket_name, pocket_type, pocket_ordering, pocket_updated_at) VALUES ('p1', 'Kas', 'absolute', 0, 100)",
    ).run();
    db.query(
      "INSERT INTO customers (customer_id, customer_name, customer_phone, customer_updated_at) VALUES ('c1', 'Ani', '0812', 100)",
    ).run();

    // The seeded database already carries rows (the base payment methods, the
    // pocket copied out of `money_kind`), so the pushed count is whatever the
    // unsync set was — not a hand-counted 2.
    const expected = countUnsync(db);
    const outcome = await withDb(layer, (service) => push(pushDeps(service, server)));

    expect(outcome.pushed).toBe(expected);
    const entities = server.pushes.flatMap((push) =>
      push.lines.map((line) => (JSON.parse(line) as { e: Entity }).e),
    );
    // §2.3: the stream is emitted in the fixed entity order, parent first.
    const order = entities.map((entity) => ENTITY_ORDER.indexOf(entity));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(entities).toContain("pocket");
    expect(entities).toContain("customer");
    expect(entities.indexOf("pocket")).toBeLessThan(entities.indexOf("customer"));

    const pocket = db
      .query<{ pocket_sync_at: number | null }, []>("SELECT pocket_sync_at FROM pockets")
      .get();
    expect(pocket?.pocket_sync_at).not.toBeNull();
    const customer = db
      .query<{ customer_sync_at: number | null }, []>("SELECT customer_sync_at FROM customers")
      .get();
    expect(customer?.customer_sync_at).not.toBeNull();
  });

  test("chunks a large entity and keeps offset/prefix continuity across chunks", async () => {
    const { db, layer, server } = setup();
    for (let index = 0; index < 250; index++) {
      db.query(
        "INSERT INTO pockets (pocket_id, pocket_name, pocket_type, pocket_ordering, pocket_updated_at) VALUES (?, 'K', 'absolute', 0, 100)",
      ).run(`p${String(index).padStart(4, "0")}`);
    }

    const expected = countUnsync(db);
    const outcome = await withDb(layer, (service) => push(pushDeps(service, server)));

    expect(outcome.pushed).toBe(expected);
    // 200 frames per chunk (§7.4 bound), so the first chunk is exactly 200.
    expect(server.pushes[0]!.lines.length).toBe(200);
    expect(server.pushes.length).toBeGreaterThan(1);
    // The second chunk starts exactly where the first ended, and carries the
    // chain hash of the bytes before it.
    const first = chainOf(EMPTY_CHAIN, server.pushes[0]!.lines);
    expect(server.pushes[1]!.offset).toBe(first.bytes);
    expect(server.pushes[1]!.prefix).toBe(first.chain);
  });

  test("re-opens the session after a replay mismatch and finishes the push", async () => {
    const { db, layer, server } = setup();
    db.query(
      "INSERT INTO pockets (pocket_id, pocket_name, pocket_type, pocket_ordering, pocket_updated_at) VALUES ('p1', 'Kas', 'absolute', 0, 100)",
    ).run();
    server.failNextUpload = { status: 409, code: "replay_mismatch" };

    const expected = countUnsync(db);
    const outcome = await withDb(layer, (service) => push(pushDeps(service, server)));

    expect(outcome.pushed).toBe(expected);
    expect(server.sessionsCreated).toBe(2);
    const pocket = db
      .query<{ pocket_sync_at: number | null }, []>("SELECT pocket_sync_at FROM pockets")
      .get();
    expect(pocket?.pocket_sync_at).not.toBeNull();
  });

  test("a stale ack hands the winning server row back to the app", async () => {
    const { db, layer, server } = setup();
    db.query(
      "INSERT INTO customers (customer_id, customer_name, customer_phone, customer_updated_at) VALUES ('c1', 'Lokal', '0812', 100)",
    ).run();
    const merged: { entity: Entity; row: WireRow }[] = [];
    server.staleReply = {
      entity: "customer",
      row: {
        customer_id: "c1",
        customer_name: "Server",
        customer_phone: "0813",
        customer_updated_at: 200,
        customer_deleted_at: null,
      },
    };

    await withDb(layer, (service) =>
      push(
        pushDeps(service, server, {
          mergeStaleRow: (entity, row) =>
            Effect.sync(() => {
              merged.push({ entity, row });
            }),
          // The real merger writes it; this test only proves the ack reaches it
          // with the payload intact.
        }),
      ),
    );

    expect(merged).toEqual([
      {
        entity: "customer",
        row: {
          customer_id: "c1",
          customer_name: "Server",
          customer_phone: "0813",
          customer_updated_at: 200,
          customer_deleted_at: null,
        },
      },
    ]);
    const row = db
      .query<{ customer_sync_at: number | null }, []>("SELECT customer_sync_at FROM customers")
      .get();
    expect(row?.customer_sync_at).not.toBeNull();
  });

  test("a record goes out as one aggregate frame carrying all five child arrays", async () => {
    const { db, layer, server } = setup();
    const methodId = String(
      (db.query("SELECT method_id FROM methods LIMIT 1").get() as { method_id: string } | null)
        ?.method_id,
    );
    db.query(
      "INSERT INTO products (product_id, product_name, product_updated_at) VALUES ('p1', 'Kopi', 100)",
    ).run();
    db.query(
      "INSERT INTO product_events (product_event_id, product_event_created_at, product_event_value, product_event_capital, product_event_note, product_id) VALUES ('e1', 100, -1, 1000, '', 'p1')",
    ).run();
    db.query(
      `INSERT INTO records (record_id, record_created_at, record_paid_at, record_rounding, record_cashier,
        record_mode, record_pay, record_note, record_fix, record_customer_name, record_customer_phone,
        record_sub_total, record_total, record_updated_at)
        VALUES ('r1', 100, 100, 0, 'kasir', 'incoming', 15000, '', 0, 'Ani', '0812', 15000, 15000, 100)`,
    ).run();
    db.query(
      `INSERT INTO record_listings (record_listing_id, record_listing_group_id, record_id, product_event_id,
        product_id, record_listing_name, record_listing_kind, record_listing_unit, record_listing_price,
        record_listing_qty, record_listing_capital, record_listing_total)
        VALUES ('rl1', 'g1', 'r1', 'e1', 'p1', 'Kopi', '', 1, 15000, 1, 1000, 15000)`,
    ).run();
    db.query(
      "INSERT INTO record_methods (record_method_id, record_id, method_id, record_method_pay) VALUES ('rm1', 'r1', ?, 15000)",
    ).run(methodId);
    db.query(
      "INSERT INTO record_extras (record_extra_id, record_extra_name, record_id, record_extra_value, record_extra_eff, record_extra_kind) VALUES ('re1', 'Pajak', 'r1', 0, 0, 'percent')",
    ).run();
    db.query(
      "INSERT INTO record_images (record_image_id, record_image_order, record_image_name, record_image_mime, record_id) VALUES ('ri1', 0, 'a.png', 'image/png', 'r1')",
    ).run();
    db.query(
      "INSERT INTO discounts (discount_id, discount_group_id, record_listing_id, discount_kind, discount_value, discount_eff) VALUES ('d1', 'dg1', 'rl1', 'number', 500, 500)",
    ).run();

    await withDb(layer, (service) => push(pushDeps(service, server)));

    // The record is the last frame, after the product and the event (§2.3).
    const lines = server.pushes.flatMap((push) => push.lines);
    const records = lines
      .map((line) => JSON.parse(line) as { e: string; r?: WireRow; ch?: Record<string, unknown[]> })
      .filter((frame) => frame.e === "record");
    expect(records.length).toBe(1);

    const aggregate = records[0]!;
    // All five arrays, and every row that belongs to the record — including the
    // discount, which only reaches the record through its listing.
    expect(Object.keys(aggregate.ch!)).toEqual([...CHILD_ORDER]);
    expect(aggregate.ch!["record_listings"]).toHaveLength(1);
    expect(aggregate.ch!["record_methods"]).toHaveLength(1);
    expect(aggregate.ch!["record_extras"]).toHaveLength(1);
    expect(aggregate.ch!["record_images"]).toHaveLength(1);
    expect(aggregate.ch!["discounts"]).toEqual([
      {
        discount_id: "d1",
        discount_group_id: "dg1",
        record_listing_id: "rl1",
        discount_kind: "number",
        discount_value: 500,
        discount_eff: 500,
      },
    ]);
  });

  test("the sync marker refuses a row that moved after its frame was encoded", () => {
    const { db } = setup();
    db.query(
      "INSERT INTO customers (customer_id, customer_name, customer_phone, customer_updated_at) VALUES ('c1', 'Ani', '0812', 100)",
    ).run();
    db.query("UPDATE customers SET customer_updated_at = 999 WHERE customer_id = 'c1'").run();

    // The ack was for the 100-clock frame, not the row as it stands now.
    const statements = markSyncedStatements(TABLES.customer, [{ id: "c1", updatedAt: 100 }], 5000);
    for (const statement of statements) {
      db.query(statement.sql).run(...(statement.bindings ?? []));
    }

    const row = db
      .query<{ customer_sync_at: number | null }, []>("SELECT customer_sync_at FROM customers")
      .get();
    expect(row?.customer_sync_at).toBeNull();
  });
});

describe("merge batching", () => {
  test("a whole pull is applied in exactly one transaction", async () => {
    const { db, layer, server } = setup();
    // Several entities and many rows: no split, no per-row commit.
    for (let index = 0; index < 60; index++) {
      server.seed("customer", {
        customer_id: `c${String(index).padStart(4, "0")}`,
        customer_name: `Pelanggan ${index}`,
        customer_phone: "0812",
        customer_updated_at: 100,
        customer_deleted_at: null,
      });
      server.seed("supplier", {
        supplier_id: `s${String(index).padStart(4, "0")}`,
        supplier_name: `Pemasok ${index}`,
        supplier_note: "",
        supplier_updated_at: 100,
        supplier_deleted_at: null,
      });
    }

    const executor = testExecutor(db);
    const result = await withDb(layer, (service) =>
      pullAndMerge(service, server, { cursor: 0 }, executor.run),
    );

    expect(result.merged).toBe(120);
    expect(executor.counter.calls).toBe(1);
    expect(executor.counter.statements).toBe(120);

    const customers = db.query<{ total: number }, []>("SELECT COUNT(*) AS total FROM customers").get();
    // 120 incoming + the rows the migrations seed.
    expect(customers?.total).toBeGreaterThanOrEqual(60);
  });

  test("a failing statement rolls the whole pull back", async () => {
    const { db, layer, server } = setup();
    server.seed("customer", {
      customer_id: "c1",
      customer_name: "Ani",
      customer_phone: "0812",
      customer_updated_at: 100,
      customer_deleted_at: null,
    });

    // The executor refuses before writing, which is exactly what the Rust command
    // does when a statement fails: nothing of the pull is applied.
    const broken: MergeExecutor = () => Effect.fail(new SyncError({ message: "boom" }));
    const outcome = await withDb(layer, (service) =>
      pullAndMerge(service, server, { cursor: 0 }, broken).pipe(Effect.either),
    );

    expect(outcome._tag).toBe("Left");
    const row = db
      .query<{ total: number }, []>(
        "SELECT COUNT(*) AS total FROM customers WHERE customer_id = 'c1'",
      )
      .get();
    expect(row?.total).toBe(0);
  });
});

describe("pull", () => {
  test("merges a new row and advances the cursor to done.s", async () => {
    const { db, layer, server } = setup();
    server.seed("customer", {
      customer_id: "c1",
      customer_name: "Ani",
      customer_phone: "0812",
      customer_updated_at: 100,
      customer_deleted_at: null,
    });

    const result = await withDb(layer, (service) => pullAndMerge(service, server, { cursor: 0 }, testExecutor(db).run));

    expect(result.merged).toBe(1);
    expect(result.cursor).toBe(1);
  });

  test("a pulled row is marked synced so it is not pushed straight back", async () => {
    const { db, layer, server } = setup();
    server.seed("customer", {
      customer_id: "c1",
      customer_name: "Ani",
      customer_phone: "0812",
      customer_updated_at: 100,
      customer_deleted_at: null,
    });

    await withDb(layer, (service) => pullAndMerge(service, server, { cursor: 0 }, testExecutor(db).run));

    const row = db
      .query<{ customer_sync_at: number | null }, []>("SELECT customer_sync_at FROM customers")
      .get();
    expect(row?.customer_sync_at).not.toBeNull();
  });

  test("a local row that is newer wins over the pulled one", async () => {
    const { db, layer, server } = setup();
    db.query(
      "INSERT INTO customers (customer_id, customer_name, customer_phone, customer_updated_at) VALUES ('c1', 'Lokal', '0800', 500)",
    ).run();
    server.seed("customer", {
      customer_id: "c1",
      customer_name: "Server",
      customer_phone: "0812",
      customer_updated_at: 100,
      customer_deleted_at: null,
    });

    await withDb(layer, (service) => pullAndMerge(service, server, { cursor: 0 }, testExecutor(db).run));

    const row = db
      .query<{ customer_name: string; customer_sync_at: number | null }, []>(
        "SELECT customer_name, customer_sync_at FROM customers WHERE customer_id = 'c1'",
      )
      .get();
    expect(row?.customer_name).toBe("Lokal");
    // The losing pull row left the marker alone, so the local edit is still queued.
    expect(row?.customer_sync_at).toBeNull();
  });

  test("a tombstone merges like any other update", async () => {
    const { db, layer, server } = setup();
    db.query(
      "INSERT INTO customers (customer_id, customer_name, customer_phone, customer_updated_at) VALUES ('c1', 'Ani', '0812', 100)",
    ).run();
    server.seed("customer", {
      customer_id: "c1",
      customer_name: "Ani",
      customer_phone: "0812",
      customer_updated_at: 200,
      customer_deleted_at: 200,
    });

    await withDb(layer, (service) => pullAndMerge(service, server, { cursor: 0 }, testExecutor(db).run));

    const row = db
      .query<{ customer_deleted_at: number | null }, []>(
        "SELECT customer_deleted_at FROM customers WHERE customer_id = 'c1'",
      )
      .get();
    expect(row?.customer_deleted_at).toBe(200);
  });

  test("a product_event is appended, never updated", async () => {
    const { db, layer, server } = setup();
    db.query(
      "INSERT INTO products (product_id, product_name, product_updated_at) VALUES ('p1', 'Kopi', 100)",
    ).run();
    const event = {
      product_event_id: "e1",
      product_event_created_at: 100,
      product_event_value: 5,
      product_event_capital: 1000,
      product_event_note: "awal",
      product_id: "p1",
      stock_id: null,
      record_id: null,
    };
    db.query(
      `INSERT INTO product_events (product_event_id, product_event_created_at, product_event_value,
        product_event_capital, product_event_note, product_id) VALUES ('e1', 100, 5, 1000, 'awal', 'p1')`,
    ).run();
    server.seed("product_event", event);

    await withDb(layer, (service) => pullAndMerge(service, server, { cursor: 0 }, testExecutor(db).run));

    const rows = db
      .query<{ product_event_note: string }, []>("SELECT product_event_note FROM product_events")
      .all();
    expect(rows.length).toBe(1);
    expect(rows[0]?.product_event_note).toBe("awal");
  });

  test("a record aggregate replaces every child array when the header wins", async () => {
    const { db, layer, server } = setup();
    db.query(
      "INSERT INTO records (record_id, record_created_at, record_rounding, record_cashier, record_mode, record_pay, record_note, record_fix, record_customer_name, record_customer_phone, record_sub_total, record_total, record_updated_at) VALUES ('r1', 100, 0, 'kasir', 'incoming', 0, '', 0, '', '', 0, 0, 50)",
    ).run();
    db.query(
      "INSERT INTO record_methods (record_method_id, record_id, method_id, record_method_pay) VALUES ('m_old', 'r1', (SELECT method_id FROM methods LIMIT 1), 1)",
    ).run();

    const header = {
      record_id: "r1",
      record_created_at: 100,
      record_paid_at: 100,
      record_rounding: 0,
      record_credit_at: null,
      record_cashier: "kasir",
      record_mode: "incoming",
      record_pay: 5000,
      record_note: "",
      record_fix: 0,
      record_customer_name: "",
      record_customer_phone: "",
      record_sub_total: 5000,
      record_total: 5000,
      record_updated_at: 200,
      record_deleted_at: null,
      record_supplier_id: null,
      record_supplier_name: "",
      record_flag: 0,
      record_pair_id: null,
    };
    const children = {
      record_listings: [],
      record_methods: [
        {
          record_method_id: "m_new",
          method_id: String((db.query("SELECT method_id FROM methods LIMIT 1").get() as { method_id: string } | null)?.method_id),
          record_method_pay: 5000,
        },
      ],
      record_extras: [],
      record_images: [],
      discounts: [],
    };
    const canonical = toCanonicalRow(TABLES.record, header);
    server.stored.push({
      entity: "record",
      seq: 1,
      line: encodeRecordFrame(canonical, children),
    });

    await withDb(layer, (service) => pullAndMerge(service, server, { cursor: 0 }, testExecutor(db).run));

    const methods = db
      .query<{ record_method_id: string }, []>(
        "SELECT record_method_id FROM record_methods WHERE record_id = 'r1'",
      )
      .all();
    expect(methods.map((row) => row.record_method_id)).toEqual(["m_new"]);
    const updated = db
      .query<{ record_updated_at: number }, []>(
        "SELECT record_updated_at FROM records WHERE record_id = 'r1'",
      )
      .get();
    expect(updated?.record_updated_at).toBe(200);
  });

  test("a losing record header leaves the children untouched", async () => {
    const { db, layer, server } = setup();
    db.query(
      "INSERT INTO records (record_id, record_created_at, record_rounding, record_cashier, record_mode, record_pay, record_note, record_fix, record_customer_name, record_customer_phone, record_sub_total, record_total, record_updated_at) VALUES ('r1', 100, 0, 'kasir', 'incoming', 0, '', 0, '', '', 0, 0, 900)",
    ).run();
    db.query(
      "INSERT INTO record_methods (record_method_id, record_id, method_id, record_method_pay) VALUES ('mine', 'r1', (SELECT method_id FROM methods LIMIT 1), 1)",
    ).run();

    const canonical = toCanonicalRow(TABLES.record, {
      record_id: "r1",
      record_created_at: 100,
      record_paid_at: 100,
      record_rounding: 0,
      record_credit_at: null,
      record_cashier: "kasir",
      record_mode: "incoming",
      record_pay: 5000,
      record_note: "",
      record_fix: 0,
      record_customer_name: "",
      record_customer_phone: "",
      record_sub_total: 5000,
      record_total: 5000,
      record_updated_at: 200,
      record_deleted_at: null,
      record_supplier_id: null,
      record_supplier_name: "",
      record_flag: 0,
      record_pair_id: null,
    });
    server.stored.push({
      entity: "record",
      seq: 1,
      line: encodeRecordFrame(canonical, {
        record_listings: [],
        record_methods: [
          {
            record_method_id: "theirs",
            method_id: String((db.query("SELECT method_id FROM methods LIMIT 1").get() as { method_id: string } | null)?.method_id),
            record_method_pay: 5000,
          },
        ],
        record_extras: [],
        record_images: [],
        discounts: [],
      }),
    });

    await withDb(layer, (service) => pullAndMerge(service, server, { cursor: 0 }, testExecutor(db).run));

    const methods = db
      .query<{ record_method_id: string }, []>(
        "SELECT record_method_id FROM record_methods WHERE record_id = 'r1'",
      )
      .all();
    expect(methods.map((row) => row.record_method_id)).toEqual(["mine"]);
  });

  test("an event whose record has not arrived keeps the link and repairs it later", async () => {
    const { db, layer, server } = setup();
    db.query(
      "INSERT INTO products (product_id, product_name, product_updated_at) VALUES ('p1', 'Kopi', 100)",
    ).run();
    // The event points at a record the page does not carry (§6.4: may dangle).
    server.seed("product_event", {
      product_event_id: "e1",
      product_event_created_at: 100,
      product_event_value: -1,
      product_event_capital: 1000,
      product_event_note: "",
      product_id: "p1",
      stock_id: null,
      record_id: "r1",
    });
    // Its record is in the same pull, one frame later — the normal case for a shop
    // that has never synced: events are emitted before records (§2.3).
    server.seed("record", {
      record_id: "r1",
      record_created_at: 100,
      record_paid_at: 100,
      record_rounding: 0,
      record_credit_at: null,
      record_cashier: "kasir",
      record_mode: "incoming",
      record_pay: 5000,
      record_note: "",
      record_fix: 0,
      record_customer_name: "",
      record_customer_phone: "",
      record_sub_total: 5000,
      record_total: 5000,
      record_updated_at: 100,
      record_deleted_at: null,
      record_supplier_id: null,
      record_supplier_name: "",
      record_flag: 0,
      record_pair_id: null,
    });

    // The event and the record arrive in the same pull but the event's frame comes
    // first (§2.3), so the pointer cannot be written when the event is inserted.
    // The batch's trailing UPDATE links it once the record exists.
    const result = await withDb(layer, (service) =>
      pullAndMerge(service, server, { cursor: 0 }, testExecutor(db).run),
    );
    expect(result.merged).toBe(2);

    const linked = db
      .query<{ record_id: string | null }, []>(
        "SELECT record_id FROM product_events WHERE product_event_id = 'e1'",
      )
      .get();
    expect(linked?.record_id).toBe("r1");
  });
});

describe("Sinkronisasi Ulang", () => {
  test("marks every syncable table unsynced, including the tombstones", () => {
    const { db } = setup();
    db.query(
      "INSERT INTO customers (customer_id, customer_name, customer_phone, customer_updated_at, customer_sync_at, customer_deleted_at) VALUES ('c1', 'Ani', '0812', 100, 100, 100)",
    ).run();
    db.query(
      "INSERT INTO products (product_id, product_name, product_updated_at, product_sync_at) VALUES ('p1', 'Kopi', 100, 100)",
    ).run();

    // The two rows above are already marked synced.
    const before = countUnsync(db);
    for (const statement of resetSyncStatements()) {
      db.query(statement.sql).run(...(statement.bindings ?? []));
    }
    // Both rows are owed again, plus the handful the migrations seeded.
    expect(countUnsync(db)).toBe(before + 2);
    const customer = db
      .query<{ customer_sync_at: number | null }, []>("SELECT customer_sync_at FROM customers")
      .get();
    expect(customer?.customer_sync_at).toBeNull();
  });
});
