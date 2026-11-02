/**
 * The v2 money-group sync (`SYNC-V2-MONEY.md`), end to end against a fake server
 * that follows the same contract the real one does.
 *
 * The fake server assigns `seq` on every applied change, keeps a change log, and
 * answers `applied`/`noop`/`stale` by the §7.2 rules — so a test asserts the
 * *outcome* (what both sides end up holding) instead of the calls made. The
 * client's SQL runs against a real SQLite (`makeTestDatabase`), so a statement
 * that would not run in the app fails here.
 */
import { describe, expect, test } from "bun:test";
import { Effect, Fiber, Layer, Option, Stream } from "effect";
import { makeTestDatabase } from "../db/test-support";
import { MoneyLive } from "../money/live";
import { makeTestStore } from "../store/test-support";
import { SyncService, type SyncReport } from ".";
import { SyncLive } from "./live";
import { moneyDecision, pocketDecision } from "./merge";
import { TABLES, clockOf, idOf, type Entity, type WireRow } from "./schema";
import { SyncTransportService, TransportError, type SyncTransport } from "./transport";
import type { LineStream } from "./stream";

// ============================================================================
// A server that behaves like the contract says it must (§6.2, §7.2)
// ============================================================================

type Change = { seq: number; entity: Entity; row: WireRow };

class FakeServer {
  counter = 0;
  readonly changes: Change[] = [];
  readonly rows = new Map<string, WireRow>();

  private key(entity: Entity, id: string): string {
    return `${entity}:${id}`;
  }

  private store(entity: Entity, row: WireRow): number {
    this.counter += 1;
    this.rows.set(this.key(entity, idOf(TABLES[entity], row)), row);
    this.changes.push({ seq: this.counter, entity, row });
    return this.counter;
  }

  /** The seq of the current version of a row, as an ack must report it. */
  private seqOf(entity: Entity, id: string): number {
    for (let index = this.changes.length - 1; index >= 0; index -= 1) {
      const change = this.changes[index];
      if (change === undefined) continue;
      if (change.entity === entity && idOf(TABLES[entity], change.row) === id) return change.seq;
    }
    return 0;
  }

  /** §7.2: per-entity decisions, exactly one log entry per `applied` frame. */
  private apply(entity: Entity, row: WireRow): { s: string; seq: number; row?: WireRow } {
    const id = idOf(TABLES[entity], row);
    const stored = this.rows.get(this.key(entity, id));
    if (stored === undefined) {
      return { s: "applied", seq: this.store(entity, row) };
    }

    if (entity === "money") {
      const revalued = (["timestamp", "money_value", "pocket_id"] as const).some(
        (column) => stored[column] !== row[column],
      );
      if (revalued) return { s: "stale", seq: this.seqOf(entity, id), row: stored };
    }

    const identical = TABLES[entity].columns.every((column) => stored[column] === row[column]);
    if (identical) return { s: "noop", seq: this.seqOf(entity, id) };

    if (clockOf(TABLES[entity], row) > clockOf(TABLES[entity], stored)) {
      // `money` takes only the note, the tombstone and the newer clock; the rest
      // is immutable. Without the clock the row would look unedited and every
      // later client would judge the note stale.
      const next: WireRow =
        entity === "money"
          ? {
              ...stored,
              money_note: row["money_note"],
              money_deleted_at: row["money_deleted_at"],
              money_updated_at: row["money_updated_at"],
            }
          : row;
      return { s: "applied", seq: this.store(entity, next) };
    }
    return { s: "stale", seq: this.seqOf(entity, id), row: stored };
  }

  /** §7.3 ack catalog: one ack per frame, in order, then `done`. */
  push(body: string): string[] {
    const lines = body.split("\n").filter((line) => line !== "");
    const out: string[] = [];
    lines.forEach((line, index) => {
      const frame = JSON.parse(line) as { e: Entity; r: WireRow };
      const outcome = this.apply(frame.e, frame.r);
      out.push(
        JSON.stringify({
          t: "ack",
          i: index,
          e: frame.e,
          s: outcome.s,
          seq: outcome.seq,
          ...(outcome.row === undefined ? {} : { row: outcome.row }),
        }),
      );
    });
    out.push(JSON.stringify({ t: "done", frames: lines.length }));
    return out;
  }

  /** §6.2: `meta`, the changes in `(after, snapshot]`, then `done`. */
  pull(after: number, limit: number): string[] {
    if (after > this.counter) {
      throw new TransportError(400, "bad_request", "bookmark ahead of the server");
    }
    const snapshot = this.counter;
    const page = this.changes.filter((change) => change.seq > after).slice(0, limit);
    const last = page.length > 0 ? page[page.length - 1]!.seq : after;
    const more = this.changes.some((change) => change.seq > last);
    return [
      JSON.stringify({ t: "meta", snapshot }),
      ...page.map((change) =>
        JSON.stringify({ t: "row", s: change.seq, e: change.entity, r: change.row }),
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

/** A client device: its own database, its own store, one shared server. */
function setup(server = new FakeServer(), seed: Record<string, unknown> = {}) {
  const { db, layer: dbLayer } = makeTestDatabase();
  // The migrations seed the built-in pockets (Simpanan/Utang/Selisih). Every
  // test here starts from an empty group so the log it asserts is its own.
  db.exec("DELETE FROM money; DELETE FROM pockets;");
  const { entries, layer: storeLayer } = makeTestStore({
    "sync.base_url": "https://sync.test",
    "sync.token": "kst_test",
    ...seed,
  });

  const transport: SyncTransport = {
    pull(_endpoint, input) {
      try {
        return lineStream(server.pull(input.after, input.limit));
      } catch (error) {
        return failedStream(error);
      }
    },
    push(_endpoint, input) {
      return lineStream(server.push(input.body));
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
  const transportLayer = Layer.succeed(SyncTransportService, transport);
  const appLayer = SyncLive.pipe(
    Layer.provide(Layer.mergeAll(dbLayer, storeLayer, transportLayer, moneyLayer)),
  );

  return { db, entries, storeLayer, server, layer: appLayer };
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

// — local writes, as the app's own services make them ————————————————————————

function addPocket(
  db: ReturnType<typeof makeTestDatabase>["db"],
  input: { id: string; name: string; updatedAt: number; ordering?: number; syncAt?: number | null },
): void {
  db.query(
    `INSERT INTO pockets
      (pocket_id, pocket_name, pocket_type, pocket_ordering, pocket_updated_at, pocket_sync_at)
     VALUES (?, ?, 'absolute', ?, ?, ?)`,
  ).run(input.id, input.name, input.ordering ?? 1, input.updatedAt, input.syncAt ?? null);
}

function addMoney(
  db: ReturnType<typeof makeTestDatabase>["db"],
  input: {
    id: string;
    pocketId: string;
    value: number;
    timestamp: number;
    note?: string;
    updatedAt: number;
    syncAt?: number | null;
  },
): void {
  db.query(
    `INSERT INTO money
      (money_id, timestamp, money_value, pocket_id, money_note, money_updated_at, money_sync_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.id,
    input.timestamp,
    input.value,
    input.pocketId,
    input.note ?? "",
    input.updatedAt,
    input.syncAt ?? null,
  );
}

type MoneyRow = { money_value: number; money_note: string; money_sync_at: number | null };

function moneyRows(db: ReturnType<typeof makeTestDatabase>["db"]): MoneyRow[] {
  return db
    .query("SELECT money_value, money_note, money_sync_at FROM money ORDER BY money_id")
    .all() as MoneyRow[];
}

function editMoney(
  db: ReturnType<typeof makeTestDatabase>["db"],
  id: string,
  fields: { value?: number; note?: string; updatedAt: number },
): void {
  db.query(
    `UPDATE money SET
       money_value = COALESCE(?, money_value),
       money_note = COALESCE(?, money_note),
       money_updated_at = ?,
       money_sync_at = NULL
     WHERE money_id = ?`,
  ).run(fields.value ?? null, fields.note ?? null, fields.updatedAt, id);
}

// ============================================================================
// The merge rule (§8.2) — the same decisions on both sides
// ============================================================================

function pocket(id: string, name: string, updatedAt: number): WireRow {
  return {
    pocket_id: id,
    pocket_name: name,
    pocket_type: "absolute",
    pocket_ordering: 1,
    pocket_updated_at: updatedAt,
    pocket_deleted_at: null,
  };
}

function money(id: string, value: number, updatedAt: number, note = ""): WireRow {
  return {
    money_id: id,
    timestamp: 1_000,
    money_value: value,
    pocket_id: "p_01",
    money_note: note,
    money_updated_at: updatedAt,
    money_deleted_at: null,
  };
}

describe("the merge rule", () => {
  test("pockets are last-writer-wins, and a tie keeps the stored copy", () => {
    expect(pocketDecision(pocket("p_01", "Kas", 10), pocket("p_01", "Bank", 11))).toBe("applied");
    expect(pocketDecision(pocket("p_01", "Kas", 11), pocket("p_01", "Bank", 10))).toBe("stale");
    expect(pocketDecision(pocket("p_01", "Kas", 10), pocket("p_01", "Bank", 10))).toBe("stale");
    expect(pocketDecision(pocket("p_01", "Kas", 10), pocket("p_01", "Kas", 10))).toBe("noop");
  });

  test("a money note edit is accepted, an amount edit is not", () => {
    expect(moneyDecision(money("m_01", 5_000, 10), money("m_01", 5_000, 11, "kopi"))).toBe(
      "applied",
    );
    expect(moneyDecision(money("m_01", 5_000, 10), money("m_01", 9_999, 11))).toBe("stale");
    expect(moneyDecision(money("m_01", 5_000, 10), money("m_01", 5_000, 10))).toBe("noop");
    expect(moneyDecision(money("m_01", 5_000, 11), money("m_01", 5_000, 10, "kopi"))).toBe("stale");
  });
});

// ============================================================================
// A whole cycle
// ============================================================================

describe("syncMoneyGroup", () => {
  test("a first sync uploads the local rows and pulls them back marked synced", async () => {
    const device = setup();
    addPocket(device.db, { id: "p_01", name: "Kas", updatedAt: 1_000 });
    addMoney(device.db, {
      id: "m_01",
      pocketId: "p_01",
      value: 5_000,
      timestamp: 1_000,
      updatedAt: 1_000,
    });

    const report = await runSync(device.layer);

    expect(device.server.counter).toBe(2);
    expect(report.groups.money.bookmark).toBe(2);
    expect(device.entries.get("sync.money.bookmark")).toBe(2);
    // Both rows carry the server's seq, so neither is owed on the next run.
    expect(moneyRows(device.db)[0]?.money_sync_at).toBe(2);
    const pocket = device.db
      .query("SELECT pocket_sync_at FROM pockets WHERE pocket_id = 'p_01'")
      .get() as { pocket_sync_at: number };
    expect(pocket.pocket_sync_at).toBe(1);
  });

  test("a run reports one bar per group, each with its own numbers", async () => {
    const device = setup();
    addPocket(device.db, { id: "p_01", name: "Kas", updatedAt: 1_000 });
    addMoney(device.db, {
      id: "m_01",
      pocketId: "p_01",
      value: 5_000,
      timestamp: 1_000,
      updatedAt: 1_000,
    });

    const { report, state } = await Effect.runPromise(
      Effect.gen(function* () {
        const sync = yield* SyncService;
        const report = yield* sync.run("sync");
        const head = yield* Stream.runHead(sync.state);
        return { report, state: Option.getOrNull(head) };
      }).pipe(Effect.provide(device.layer)),
    );

    // One bar per group today, and the shape that makes a second group a row.
    expect(state?.groups.map((group) => group.group)).toEqual(["money"]);
    expect(state?.groups[0]?.phase).toBe("done");
    expect(state?.groups[0]?.report).toEqual(report.groups.money);
    expect(report.groups.money.bookmark).toBe(2);
    expect(report.groups.money.pushed).toBe(2);
  });

  test("a group's bar only ever moves forward, across phases and pages", async () => {
    const device = setup();
    addPocket(device.db, { id: "p_01", name: "Kas", updatedAt: 1_000 });
    // Enough rows to make the pull take more than one page (limit is 1000).
    for (let index = 0; index < 1_200; index += 1) {
      addMoney(device.db, {
        id: `m_${String(index).padStart(4, "0")}`,
        pocketId: "p_01",
        value: 1_000 + index,
        timestamp: 1_000 + index,
        updatedAt: 1_000,
      });
    }

    const progress: number[] = [];
    await Effect.runPromise(
      Effect.gen(function* () {
        const sync = yield* SyncService;
        // Every published state, in order — the same sequence the screen paints.
        const watcher = yield* Stream.runForEach(sync.state, (state) =>
          Effect.sync(() => {
            const value = state.groups[0]?.progress;
            if (typeof value === "number") progress.push(value);
          }),
        ).pipe(Effect.fork);
        yield* sync.run("sync");
        yield* Fiber.interrupt(watcher);
      }).pipe(Effect.provide(device.layer)),
    );

    // pull → merge → push → pull-again must never reset the bar: a bar that
    // runs backwards reads as an error, not as progress.
    expect(progress.length).toBeGreaterThan(3);
    for (let index = 1; index < progress.length; index += 1) {
      expect(progress[index]!).toBeGreaterThanOrEqual(progress[index - 1]!);
    }
    expect(progress[progress.length - 1]).toBe(1);
  });

  test("a second device pulls what the first pushed, pocket first", async () => {
    const server = new FakeServer();
    const first = setup(server);
    addPocket(first.db, { id: "p_01", name: "Kas", updatedAt: 1_000 });
    addMoney(first.db, {
      id: "m_01",
      pocketId: "p_01",
      value: 5_000,
      timestamp: 1_000,
      updatedAt: 1_000,
    });
    await runSync(first.layer);

    const second = setup(server);
    await runSync(second.layer);

    // The order in the log is exactly the order the push sent them.
    expect(server.changes.map((change) => change.entity)).toEqual(["pocket", "money"]);
    expect(moneyRows(second.db)).toEqual([
      { money_value: 5_000, money_note: "", money_sync_at: 2 },
    ]);
    expect(second.entries.get("sync.money.bookmark")).toBe(2);
  });

  test("a note edit travels; an amount edit is repaired by the server's row", async () => {
    const server = new FakeServer();
    const first = setup(server);
    addPocket(first.db, { id: "p_01", name: "Kas", updatedAt: 1_000 });
    addMoney(first.db, {
      id: "m_01",
      pocketId: "p_01",
      value: 5_000,
      timestamp: 1_000,
      updatedAt: 1_000,
    });
    await runSync(first.layer);

    const second = setup(server);
    await runSync(second.layer);

    // The one field a human is expected to correct.
    editMoney(second.db, "m_01", { note: "kopi", updatedAt: 2_000 });
    await runSync(second.layer);
    expect(moneyRows(second.db)[0]?.money_note).toBe("kopi");

    // The first device sees the new note on its next pull.
    await runSync(first.layer);
    expect(moneyRows(first.db)[0]?.money_note).toBe("kopi");

    // A buggy edit of the amount is refused and repaired locally: nothing new
    // was logged, and the ledger did not change.
    const before = server.counter;
    editMoney(second.db, "m_01", { value: 9_999, updatedAt: 3_000 });
    const report = await runSync(second.layer);
    expect(server.counter).toBe(before);
    expect(report.stale).toBeGreaterThan(0);
    expect(moneyRows(second.db)[0]?.money_value).toBe(5_000);
    expect(moneyRows(second.db)[0]?.money_sync_at).toBe(before);
  });

  test("re-pushing a row the server already has spends no seq", async () => {
    const device = setup();
    addPocket(device.db, { id: "p_01", name: "Kas", updatedAt: 1_000 });
    addMoney(device.db, {
      id: "m_01",
      pocketId: "p_01",
      value: 5_000,
      timestamp: 1_000,
      updatedAt: 1_000,
    });
    await runSync(device.layer);
    expect(device.server.counter).toBe(2);

    // A lost ack: the row is owed again, and the server already has it.
    device.db.query("UPDATE money SET money_sync_at = NULL").run();
    await runSync(device.layer);

    expect(device.server.counter).toBe(2);
    expect(moneyRows(device.db)[0]?.money_sync_at).toBe(2);
  });

  test("a money row whose pocket is unknown is parked, then written once it arrives", async () => {
    const device = setup();
    // The server learns about a money row before its pocket — legal (§10), and a
    // normal race when two tills push at once.
    device.server.push(`${JSON.stringify({ e: "money", r: money("m_09", 7_000, 1_000) })}\n`);

    await runSync(device.layer);
    expect(moneyRows(device.db)).toEqual([]);
    expect(device.entries.get("sync.money.parked")).toEqual([
      { seq: 1, row: money("m_09", 7_000, 1_000) },
    ]);

    // The pocket arrives on the next cycle, and the parked row is retried.
    device.server.push(`${JSON.stringify({ e: "pocket", r: pocket("p_01", "Kas", 1_000) })}\n`);
    await runSync(device.layer);

    expect(moneyRows(device.db)).toEqual([
      { money_value: 7_000, money_note: "", money_sync_at: 1 },
    ]);
    expect(device.entries.has("sync.money.parked")).toBe(false);
  });

  test("a bookmark the server refuses is discarded and the group is pulled from zero", async () => {
    const device = setup(undefined, { "sync.money.bookmark": 999 });
    device.server.push(`${JSON.stringify({ e: "pocket", r: pocket("p_01", "Kas", 1_000) })}\n`);

    await runSync(device.layer);

    expect(device.entries.get("sync.money.bookmark")).toBe(1);
    expect(device.db.query("SELECT pocket_name, pocket_sync_at FROM pockets").all()).toEqual([
      { pocket_name: "Kas", pocket_sync_at: 1 },
    ]);
  });

  test("Sinkronisasi Ulang queues every row so a device from before v2 gets uploaded", async () => {
    const device = setup();
    // A row that claims it is already on the server (a v1 marker), which v2 has
    // never seen.
    addPocket(device.db, { id: "p_01", name: "Kas", updatedAt: 1_000, syncAt: 123_456 });
    addMoney(device.db, {
      id: "m_01",
      pocketId: "p_01",
      value: 5_000,
      timestamp: 1_000,
      updatedAt: 1_000,
      syncAt: 123_456,
    });

    await runSync(device.layer, "reset");

    expect(device.server.counter).toBe(2);
    expect(moneyRows(device.db)[0]?.money_sync_at).toBe(2);
  });
});
