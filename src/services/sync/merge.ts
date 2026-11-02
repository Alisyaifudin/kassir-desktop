/**
 * The merge half of the loop: the one rule, applied at merge point A (§8, §11.2).
 *
 * The same two decisions (pocket LWW, money insert/note/soft-delete) are used by
 * the pull here and by the `stale` ack path in `push.ts`, with "stored" meaning
 * the local row in both cases. That is what makes the two sides converge instead
 * of oscillating: whichever copy is newer wins, wherever the comparison happens.
 *
 * ## One page, one transaction
 *
 * A pull page is applied as a single statement batch through `sync_merge`, so the
 * rows and their `*_sync_at` markers appear together or not at all (§6.4). The
 * bookmark is written after that commit — a crash in between re-pulls the same
 * page, which is harmless because every write is idempotent.
 *
 * ## Missing pockets (§10.1)
 *
 * The local schema enforces `money.pocket_id REFERENCES pockets`, which the server
 * deliberately does not. A page may therefore carry a money row before its pocket
 * exists on this device. Those rows are **parked**, not dropped and not allowed
 * to abort the page: the park is retried against every later page, and a money row
 * is only written once its pocket is known.
 */
import { Context, Effect } from "effect";
import type { DatabaseService } from "../db";
import type { MergeStatement } from "./transport";
import { SyncError } from ".";
import {
  TABLES,
  clockOf,
  idOf,
  toCanonicalRow,
  type Entity,
  type EntityDef,
  type WireRow,
} from "./schema";
import {
  deleteRowStatement,
  markSyncedStatement,
  forceUpsertStatement,
  selectByIdsSql,
  upsertIfNewerStatement,
} from "./sql";

type DatabaseServiceImpl = Context.Tag.Service<typeof DatabaseService>;

/** Bound on `IN (...)` lists so a huge page cannot exceed SQLite's variable cap. */
const IN_CHUNK = 400;

/** What one frame decided (§8.2). */
export type MergeDecision = "applied" | "noop" | "stale";

/** One `row` line from a pull. */
export type PullChange = { seq: number; entity: Entity; row: WireRow };

/** One `del` line from a pull (reserved, §9.3). */
export type PullDelete = { seq: number; entity: Entity; id: string };

export type PullPage = { changes: PullChange[]; deletions: PullDelete[] };

/**
 * A money row whose pocket was not on this device yet, kept with the `seq` it
 * arrived at so it can be marked synced when it is finally written.
 */
export type ParkedMoney = { seq: number; row: WireRow };

export type MergeStats = {
  /** Frames that changed a local row. */
  applied: number;
  /** Frames whose local row was already identical. */
  noop: number;
  /** Frames the local copy won. */
  stale: number;
  /** Money frames left waiting for their pocket. */
  parked: number;
};

/** Applies statements as one transaction. Injected: Rust in the app, SQLite in tests. */
export type MergeExecutor = (
  statements: MergeStatement[],
  what: Entity | "pull" | "push",
) => Effect.Effect<void, SyncError>;

export type MergeDeps = {
  db: DatabaseServiceImpl;
  execute: MergeExecutor;
};

// ============================================================================
// The rule (§8.2)
// ============================================================================

function value(value: unknown): string | number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") return value;
  return null;
}

/** True when every wire column is equal, the `*_updated_at` included. */
export function sameRow(def: EntityDef, left: WireRow, right: WireRow): boolean {
  return def.columns.every((column) => value(left[column]) === value(right[column]));
}

/**
 * `pockets` — full last-writer-wins (§8.2).
 *
 * A tie goes to the stored copy: an equal clock with different content is not a
 * newer change, and the server compares the same way.
 */
export function pocketDecision(local: WireRow, incoming: WireRow): MergeDecision {
  if (sameRow(TABLES.pocket, local, incoming)) return "noop";
  return clockOf(TABLES.pocket, incoming) > clockOf(TABLES.pocket, local) ? "applied" : "stale";
}

/** The three money columns a later push must never rewrite (§8.1). */
const MONEY_IMMUTABLE = ["timestamp", "money_value", "pocket_id"] as const;

/**
 * `money` — insert, note edit, soft delete; never re-price (§8.2).
 *
 * A copy whose amount, business time or pocket differs is not a newer version of
 * the row, it is a different row wearing the same id, so the stored copy wins.
 */
export function moneyDecision(local: WireRow, incoming: WireRow): MergeDecision {
  const revalued = MONEY_IMMUTABLE.some(
    (column) => value(local[column]) !== value(incoming[column]),
  );
  if (revalued) return "stale";
  if (sameRow(TABLES.money, local, incoming)) return "noop";
  return clockOf(TABLES.money, incoming) > clockOf(TABLES.money, local) ? "applied" : "stale";
}

/** The decision for one table. */
export function decide(entity: Entity, local: WireRow, incoming: WireRow): MergeDecision {
  return entity === "pocket" ? pocketDecision(local, incoming) : moneyDecision(local, incoming);
}

// ============================================================================
// Applying a page
// ============================================================================

type LocalRows = Map<Entity, Map<string, WireRow>>;

function dbError(error: { message: string }): SyncError {
  return new SyncError({ message: `Sinkronisasi gagal disimpan: ${error.message}` });
}

/** Reads the local copies of every id this page (and the park) mentions. */
function readLocal(
  db: DatabaseServiceImpl,
  ids: Map<Entity, Set<string>>,
): Effect.Effect<LocalRows, SyncError> {
  return Effect.gen(function* () {
    const out: LocalRows = new Map();
    for (const [entity, set] of ids) {
      const def = TABLES[entity];
      const map = new Map<string, WireRow>();
      const list = [...set];
      for (let start = 0; start < list.length; start += IN_CHUNK) {
        const slice = list.slice(start, start + IN_CHUNK);
        if (slice.length === 0) continue;
        const { sql, bindings } = selectByIdsSql(def, slice);
        const rows = yield* db
          .selectMany<Record<string, unknown>>(sql, bindings)
          .pipe(Effect.mapError(dbError));
        for (const row of rows) {
          const canonical = toCanonicalRow(def, row);
          map.set(idOf(def, canonical), canonical);
        }
      }
      out.set(entity, map);
    }
    return out;
  });
}

/**
 * Every id this page touches — including the **pockets the money rows reference**.
 *
 * That last part is what makes the two-pass rule work: a page carrying only money
 * changes has to be able to answer "is this row's pocket already on this device?",
 * and the answer lives in `pockets`, not in the page (§10.1).
 */
function idsIn(page: PullPage, parked: readonly ParkedMoney[]): Map<Entity, Set<string>> {
  const ids = new Map<Entity, Set<string>>([
    ["pocket", new Set<string>()],
    ["money", new Set<string>()],
  ]);
  const addPocketRef = (row: WireRow): void => {
    ids.get("pocket")?.add(String(row["pocket_id"]));
  };
  for (const change of page.changes) {
    ids.get(change.entity)?.add(String(change.row[TABLES[change.entity].pk]));
    if (change.entity === "money") addPocketRef(change.row);
  }
  for (const deletion of page.deletions) ids.get(deletion.entity)?.add(deletion.id);
  for (const parkedRow of parked) {
    ids.get("money")?.add(String(parkedRow.row[TABLES.money.pk]));
    addPocketRef(parkedRow.row);
  }
  return ids;
}

/**
 * Plans one row into statements.
 *
 * `applied` overwrites, `noop` only marks the row synced, `stale` writes nothing:
 * the local copy already won, and (being unsynced) it will be pushed, where the
 * server will either accept it or answer `stale` with its own copy.
 */
function planRow(
  def: EntityDef,
  local: WireRow | undefined,
  incoming: WireRow,
  seq: number,
  statements: MergeStatement[],
  stats: MergeStats,
): void {
  if (local === undefined) {
    statements.push(upsertIfNewerStatement(def, incoming, seq));
    stats.applied += 1;
    return;
  }
  const decision = decide(def.entity, local, incoming);
  stats[decision] += 1;
  if (decision === "applied") {
    statements.push(upsertIfNewerStatement(def, incoming, seq));
  } else if (decision === "noop") {
    statements.push(markSyncedStatement(def, idOf(def, incoming), seq, clockOf(def, incoming)));
  }
}

/**
 * Applies one pull page and returns what is still parked.
 *
 * The two passes matter (§10.1): every pocket in the page is written before any
 * money row is considered, so a page that carries a pocket and its first money
 * row in the wrong order still lands. Rows whose pocket is nowhere on this device
 * are carried into `parked`, which the caller persists with the bookmark.
 */
export function mergePage(
  deps: MergeDeps,
  page: PullPage,
  parked: readonly ParkedMoney[] = [],
): Effect.Effect<{ stats: MergeStats; parked: ParkedMoney[] }, SyncError> {
  return Effect.gen(function* () {
    const stats: MergeStats = { applied: 0, noop: 0, stale: 0, parked: 0 };
    const statements: MergeStatement[] = [];

    const local = yield* readLocal(deps.db, idsIn(page, parked));

    for (const deletion of page.deletions) {
      statements.push(deleteRowStatement(TABLES[deletion.entity], deletion.id));
    }

    // Pass 1: pockets, so a money row in this same page can rely on them.
    const pockets = page.changes.filter((change) => change.entity === "pocket");
    for (const change of pockets) {
      planRow(
        TABLES.pocket,
        local.get("pocket")?.get(String(change.row[TABLES.pocket.pk])),
        change.row,
        change.seq,
        statements,
        stats,
      );
    }

    // Pass 2: money, parked when its pocket is not known.
    const knownPockets = new Set<string>(local.get("pocket")?.keys() ?? []);
    for (const change of pockets) knownPockets.add(String(change.row[TABLES.pocket.pk]));

    // Keyed by `money_id`, so a page re-pulled after a crash (the bookmark only
    // moves on commit) parks the same row once, not once per attempt.
    const stillParked = new Map<string, ParkedMoney>();
    const writeMoney = (row: WireRow, seq: number): void => {
      const id = idOf(TABLES.money, row);
      if (!knownPockets.has(String(row["pocket_id"]))) {
        stillParked.set(id, { seq, row });
        return;
      }
      stillParked.delete(id);
      planRow(TABLES.money, local.get("money")?.get(id), row, seq, statements, stats);
    };

    // The park from earlier pages first: their pocket may have just arrived.
    for (const waiting of parked) writeMoney(waiting.row, waiting.seq);
    for (const change of page.changes) {
      if (change.entity === "money") writeMoney(change.row, change.seq);
    }

    stats.parked = stillParked.size;
    yield* deps.execute(statements, "pull");
    return { stats, parked: [...stillParked.values()] };
  });
}

/**
 * Applies the server's winning row from a `stale` ack (merge point C, §7.3).
 *
 * The guard (`since`) is the clock this device uploaded: a row the cashier edited
 * after its frame left keeps the local value, stays unsynced, and is compared
 * again on the next pass. Without that, an edit made while the request was in
 * flight would be silently overwritten by the answer to the old one.
 */
export function staleStatement(
  entity: Entity,
  row: WireRow,
  seq: number,
  since: number,
): MergeStatement {
  return forceUpsertStatement(TABLES[entity], row, seq, since);
}
