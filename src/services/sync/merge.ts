/**
 * The merge half of the loop: the one rule per merge kind, applied at merge point
 * A (`SYNC-V2.md` §5, §5.8).
 *
 * The same decisions are used by the pull here and by the `stale` ack path in
 * `push.ts`, with "stored" meaning the local row/aggregate in both cases. That is
 * what makes the two sides converge instead of oscillating: whichever copy is
 * newer wins, wherever the comparison happens.
 *
 * ## One page, one transaction
 *
 * A pull page is applied as a single statement batch through `sync_merge`, so the
 * rows and their `*_sync_at` markers appear together or not at all (§3.3). The
 * bookmark is written after that commit — a crash in between re-pulls the same
 * page, which is harmless because every write is idempotent.
 *
 * ## Missing pockets (§7.5)
 *
 * The local schema enforces `money.pocket_id REFERENCES pockets`, which the server
 * deliberately does not. A page may therefore carry a money row before its pocket
 * exists on this device. Those rows are **parked**, not dropped and not allowed
 * to abort the page: the park is retried against every later page, and a money row
 * is only written once its pocket is known.
 */
import { Context, Effect } from "effect";
import { log } from "~/lib/log";
import type { DatabaseService } from "../db";
import type { MergeStatement } from "./transport";
import { SyncError } from ".";
import {
  GROUPS,
  TABLES,
  clockOf,
  idOf,
  toCanonicalChild,
  toCanonicalRow,
  type ChildDef,
  type EntityDef,
  type SyncGroup,
  type WireChildren,
  type WireRow,
} from "./schema";
import {
  bookmarkStatement,
  deleteAggregateStatements,
  deleteRowStatement,
  forceAggregateStatements,
  forceUpsertStatement,
  insertIfAbsentStatement,
  journalCapitalSql,
  markAggregateSyncedStatement,
  markSyncedStatement,
  parkedStatements,
  rebuildStockStatements,
  selectByIdsSql,
  selectChildrenByRecordsSql,
  upsertAggregateStatements,
  upsertIfNewerStatement,
} from "./sql";

type DatabaseServiceImpl = Context.Tag.Service<typeof DatabaseService>;

/** Bound on `IN (...)` lists so a huge page cannot exceed SQLite's variable cap. */
const IN_CHUNK = 400;

/** What one frame decided (§4.3). */
export type MergeDecision = "applied" | "noop" | "stale";

/** One `row` line from a pull. */
export type PullChange = { seq: number; entity: string; row: WireRow };

/** One `ag` line from a pull — the record aggregate. */
export type PullAggregate = { seq: number; row: WireRow; children: WireChildren };

/** One `del` line from a pull (reserved, §6). */
export type PullDelete = { seq: number; entity: string; id: string };

export type PullPage = {
  changes: PullChange[];
  aggregates: PullAggregate[];
  deletions: PullDelete[];
};

/**
 * A money row whose pocket was not on this device yet, kept with the `seq` it
 * arrived at so it can be marked synced when it is finally written.
 */
export type ParkedMoney = { seq: number; row: WireRow };

export type MergeStats = {
  /** Frames that changed a local row/aggregate. */
  applied: number;
  /** Frames whose local row/aggregate was already identical. */
  noop: number;
  /** Frames the local copy won. */
  stale: number;
  /** Money frames left waiting for their pocket. */
  parked: number;
};

/** Applies statements as one transaction. Injected: Rust in the app, SQLite in tests. */
export type MergeExecutor = (
  statements: MergeStatement[],
  what: string,
) => Effect.Effect<void, SyncError>;

export type MergeDeps = {
  db: DatabaseServiceImpl;
  execute: MergeExecutor;
};

// ============================================================================
// The rules (§5)
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

/** The three money columns a later push must never rewrite (§5.4). */
const MONEY_IMMUTABLE = ["timestamp", "money_value", "pocket_id"] as const;

/**
 * The decision for one row entity (§5.2–§5.4).
 *
 * - `lww`: identical → `noop`; newer clock → `applied`; tie/older → `stale`.
 * - `money`: an immutable financial field differs → `stale` (the ledger never
 *   re-prices); otherwise the plain rule.
 * - `append`: the id is the whole identity — present → `noop`, absent → insert.
 */
export function decide(def: EntityDef, local: WireRow, incoming: WireRow): MergeDecision {
  if (def.kind === "append") return "noop";
  if (def.kind === "money") {
    const revalued = MONEY_IMMUTABLE.some(
      (column) => value(local[column]) !== value(incoming[column]),
    );
    if (revalued) return "stale";
  }
  if (sameRow(def, local, incoming)) return "noop";
  return clockOf(def, incoming) > clockOf(def, local) ? "applied" : "stale";
}

/** True when every child column of every row is equal, as a set keyed by pk. */
function sameChildren(child: ChildDef, left: WireRow[], right: WireRow[]): boolean {
  if (left.length !== right.length) return false;
  const byPk = new Map(right.map((row) => [String(row[child.pk]), row]));
  for (const row of left) {
    const other = byPk.get(String(row[child.pk]));
    if (other === undefined) return false;
    for (const column of child.columns) {
      if (value(row[column]) !== value(other[column])) return false;
    }
  }
  return true;
}

/**
 * `sameAggregate` (§5.5): every header column by value, and each child set as a
 * set keyed by primary key. Child array order is not semantic.
 */
export function sameAggregate(
  def: EntityDef,
  children: readonly ChildDef[],
  leftHeader: WireRow,
  leftChildren: WireChildren,
  rightHeader: WireRow,
  rightChildren: WireChildren,
): boolean {
  if (!sameRow(def, leftHeader, rightHeader)) return false;
  return children.every((child) =>
    sameChildren(child, leftChildren[child.key] ?? [], rightChildren[child.key] ?? []),
  );
}

/** The aggregate decision (§5.5): identical → `noop`; newer → `applied`; else `stale`. */
export function decideAggregate(
  def: EntityDef,
  children: readonly ChildDef[],
  localHeader: WireRow,
  localChildren: WireChildren,
  incomingHeader: WireRow,
  incomingChildren: WireChildren,
): MergeDecision {
  if (sameAggregate(def, children, localHeader, localChildren, incomingHeader, incomingChildren)) {
    return "noop";
  }
  return clockOf(def, incomingHeader) > clockOf(def, localHeader) ? "applied" : "stale";
}

// ============================================================================
// Applying a page
// ============================================================================

type LocalRows = Map<string, Map<string, WireRow>>;

function dbError(error: { message: string }): SyncError {
  return new SyncError({ message: `Sinkronisasi gagal disimpan: ${error.message}` });
}

function chunks<T>(items: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let start = 0; start < items.length; start += IN_CHUNK) {
    out.push(items.slice(start, start + IN_CHUNK));
  }
  return out;
}

/**
 * Reports every lot whose cached cost the fold is about to change, then hands back
 * the statements that fold them.
 *
 * `stocks` is a projection of the journal, so a fold is also the only thing that can
 * move a cached cost — including on a device whose cache came from somewhere else
 * (a database migrated from the pre-v2 schema, rows imported with a `capital` field
 * that held the price). That is legitimate: the journal is the source of truth. What
 * is *not* acceptable is moving it with no trace, so the disagreement is named
 * before the statements that cause it are built.
 *
 * Both halves of the cycle use this: a page that carries other devices' journal, and
 * a push that has just uploaded this device's own (its rows never come back, so the
 * closing pull cannot fold them).
 */
export function stockFoldStatements(
  db: DatabaseServiceImpl,
  productIds: readonly string[],
): Effect.Effect<MergeStatement[]> {
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return Effect.succeed([]);
  return logCapitalDrift(db, ids).pipe(Effect.map(() => rebuildStockStatements(ids)));
}

/**
 * Lots whose cached cost the fold is about to change, logged before it does.
 *
 * Best effort in two ways: the first chunk of the page's products only, and
 * `info`. It is a pointer to the rows and the two numbers, not a ledger.
 */
function logCapitalDrift(
  db: DatabaseServiceImpl,
  productIds: readonly string[],
): Effect.Effect<void> {
  const ids = productIds.slice(0, IN_CHUNK);
  if (ids.length === 0) return Effect.void;
  const list = ids.map((_, index) => `$${index + 1}`).join(", ");
  // Read the journal's answer with the fold's own rule, or the report would name a
  // drift on every lot whose cost was deliberately zeroed: the fold keeps the 0.
  const sql = `SELECT s.product_id, s.stock_id, s.stock_capital AS cached,
      ${journalCapitalSql(
        "s.stock_id",
        `(SELECT n.product_event_capital FROM product_events n
          WHERE n.stock_id = s.stock_id
          ORDER BY n.product_event_created_at DESC, n.product_event_id DESC LIMIT 1)`,
      )} AS journal
    FROM stocks s
    WHERE s.product_id IN (${list})
    LIMIT 500`;
  return db.selectMany<{ product_id: string; stock_id: string; cached: number; journal: number }>(
    sql,
    ids,
  ).pipe(
    Effect.flatMap((rows) => {
      const drift = rows.filter((row) => row.cached !== row.journal);
      if (drift.length === 0) return Effect.void;
      const sample = drift
        .slice(0, 5)
        .map((row) => `${row.stock_id} ${row.cached}→${row.journal}`)
        .join(", ");
      return Effect.sync(() =>
        log.info(
          `sync: ${drift.length} lot modalnya dihitung ulang dari jurnal (${sample}${drift.length > 5 ? ", …" : ""})`,
        ),
      );
    }),
    // A diagnostic must never fail a page — but a diagnostic that itself fails
    // must not vanish either: the drift report it would have printed is the
    // only record that the fold skipped products.
    Effect.catchAllCause((cause) =>
      Effect.sync(() =>
        log.error(new Error(`sync: diag modal gagal dijalankan: ${String(cause)}`)),
      ),
    ),
  );
}

/**
 * The products among `ids` that own a lot with no `stocks` row.
 *
 * The one hole a pulled **product** row can leave in the projection: the journal of
 * a lot can arrive before the product it hangs off, and the fold skips a lot whose
 * product is not on the device yet. When the product finally lands its journal is
 * already stored and nothing else will re-fold it — so this is the question that
 * decides whether a product row needs a rebuild at all.
 *
 * A handful of index probes per product, which is what makes it usable on a page
 * of five thousand catalogue rows. "Rebuild every product on this page" instead
 * costs seconds per page on a shop-sized journal, and answers the question for the
 * four thousand products whose lots were already folded.
 */
function productsWithUnfoldedLots(
  db: DatabaseServiceImpl,
  ids: readonly string[],
): Effect.Effect<string[]> {
  return Effect.gen(function* () {
    const out: string[] = [];
    for (const slice of chunks(ids)) {
      if (slice.length === 0) continue;
      const list = slice.map((_, index) => `$${index + 1}`).join(", ");
      const rows = yield* db
        .selectMany<{ product_id: string }>(
          `SELECT DISTINCT e.product_id FROM product_events e
            WHERE e.product_id IN (${list}) AND e.stock_id IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM stocks s WHERE s.stock_id = e.stock_id)`,
          slice,
        )
        .pipe(
          // An empty list silently skips the stock fold for these products and
          // the stale aggregate survives with no trace, so the failure is
          // recorded even though the fallback still applies.
          Effect.tapErrorTag("DbError", (error) =>
            Effect.sync(() =>
              log.error(
                `sync: gagal mencari lot yang belum di-fold (${slice.length} produk): ${error.detail}`,
              ),
            ),
          ),
          Effect.orElseSucceed(() => []),
        );
      for (const row of rows) out.push(row.product_id);
    }
    return out;
  });
}

/** Reads the local copies of every id this page (and the park) mentions. */
function readLocal(
  db: DatabaseServiceImpl,
  group: SyncGroup,
  ids: Map<string, Set<string>>,
): Effect.Effect<LocalRows, SyncError> {
  return Effect.gen(function* () {
    const out: LocalRows = new Map();
    for (const def of GROUPS[group].entities) {
      if (def.kind === "aggregate") continue;
      const set = ids.get(def.entity);
      const map = new Map<string, WireRow>();
      if (set !== undefined && set.size > 0) {
        for (const slice of chunks([...set])) {
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
      }
      out.set(def.entity, map);
    }
    return out;
  });
}

type LocalAggregate = { header: WireRow; children: WireChildren };

/** Reads the local headers and child sets of the aggregates a page mentions. */
function readLocalAggregates(
  db: DatabaseServiceImpl,
  group: SyncGroup,
  ids: readonly string[],
): Effect.Effect<Map<string, LocalAggregate>, SyncError> {
  return Effect.gen(function* () {
    const out = new Map<string, LocalAggregate>();
    const def = GROUPS[group].entities.find((entry) => entry.kind === "aggregate");
    const children = GROUPS[group].children;
    if (def === undefined || children === undefined) return out;
    for (const slice of chunks(ids)) {
      if (slice.length === 0) continue;
      const { sql, bindings } = selectByIdsSql(def, slice);
      const headers = yield* db
        .selectMany<Record<string, unknown>>(sql, bindings)
        .pipe(Effect.mapError(dbError));
      for (const raw of headers) {
        const header = toCanonicalRow(def, raw);
        out.set(idOf(def, header), { header, children: emptyAggregateChildren(children) });
      }
      for (const child of children) {
        const query = selectChildrenByRecordsSql(child, slice.length);
        const rows = yield* db
          .selectMany<Record<string, unknown>>(query, slice)
          .pipe(Effect.mapError(dbError));
        for (const raw of rows) {
          const parentId = String(raw["parent_key"]);
          const aggregate = out.get(parentId);
          if (aggregate === undefined) continue;
          aggregate.children[child.key] ??= [];
          aggregate.children[child.key]!.push(toCanonicalChild(child, raw));
        }
      }
    }
    return out;
  });
}

function emptyAggregateChildren(children: readonly ChildDef[]): WireChildren {
  const out: WireChildren = {};
  for (const child of children) out[child.key] = [];
  return out;
}

/**
 * Every id this page touches — including the **pockets the money rows reference**.
 *
 * That last part is what makes the two-pass rule work: a page carrying only money
 * changes has to be able to answer "is this row's pocket already on this device?",
 * and the answer lives in `pockets`, not in the page (§7.5).
 */
function idsIn(group: SyncGroup, page: PullPage, parked: readonly ParkedMoney[]): Map<string, Set<string>> {
  const ids = new Map<string, Set<string>>();
  for (const def of GROUPS[group].entities) ids.set(def.entity, new Set<string>());
  const addPocketRef = (row: WireRow): void => {
    ids.get("pocket")?.add(String(row["pocket_id"]));
  };
  for (const change of page.changes) {
    ids.get(change.entity)?.add(String(change.row[TABLES[change.entity]!.pk]));
    if (change.entity === "money") addPocketRef(change.row);
  }
  for (const aggregate of page.aggregates) {
    const aggregateDef = GROUPS[group].entities.find((entry) => entry.kind === "aggregate");
    if (aggregateDef === undefined) continue;
    ids.get(aggregateDef.entity)?.add(String(aggregate.row[aggregateDef.pk]));
  }
  for (const deletion of page.deletions) ids.get(deletion.entity)?.add(deletion.id);
  for (const parkedRow of parked) {
    ids.get("money")?.add(String(parkedRow.row["money_id"]));
    addPocketRef(parkedRow.row);
  }
  return ids;
}

/**
 * Plans one row into statements.
 *
 * `applied` overwrites (or inserts), `noop` only marks the row synced, `stale`
 * writes nothing: the local copy already won, and (being unsynced) it will be
 * pushed, where the server will either accept it or answer `stale` with its own
 * copy.
 *
 * The decision is returned because one caller has follow-up work that is only
 * owed when a row actually changed: the product group's stock fold.
 */
function planRow(
  def: EntityDef,
  local: WireRow | undefined,
  incoming: WireRow,
  seq: number,
  statements: MergeStatement[],
  stats: MergeStats,
): MergeDecision {
  if (local === undefined) {
    statements.push(
      def.kind === "append"
        ? insertIfAbsentStatement(def, incoming, seq)
        : upsertIfNewerStatement(def, incoming, seq),
    );
    stats.applied += 1;
    return "applied";
  }
  const decision = decide(def, local, incoming);
  stats[decision] += 1;
  if (decision === "applied") {
    statements.push(upsertIfNewerStatement(def, incoming, seq));
  } else if (decision === "noop") {
    statements.push(markSyncedStatement(def, idOf(def, incoming), seq, clockOf(def, incoming)));
  }
  return decision;
}

/**
 * Applies one pull page and returns what is still parked.
 *
 * Row entities are processed in the group's dependency order (`product` before
 * its children, every pocket before any money) so a page that carries a parent
 * and its child in the "wrong" seq order still lands. Within one entity the
 * changes keep their seq order, so a row that appears twice ends on the newer
 * version (§3.2, P4).
 */
export function mergePage(
  deps: MergeDeps,
  group: SyncGroup,
  page: PullPage,
  parked: readonly ParkedMoney[] = [],
  /** The commit unit: the page's rows, its parked rows and its bookmark together. */
  commit?: { bookmark: number },
): Effect.Effect<{ stats: MergeStats; parked: ParkedMoney[] }, SyncError> {
  return Effect.gen(function* () {
    const stats: MergeStats = { applied: 0, noop: 0, stale: 0, parked: 0 };
    const statements: MergeStatement[] = [];
    const defs = GROUPS[group];
    const aggregateDef = defs.entities.find((entry) => entry.kind === "aggregate");

    const local = yield* readLocal(deps.db, group, idsIn(group, page, parked));

    // `del` lines first: a row that is gone locally is then re-inserted by a
    // later `row` in the same page, which is exactly the order the log has.
    for (const deletion of page.deletions) {
      const def = TABLES[deletion.entity];
      if (def === undefined) continue;
      if (def.kind === "aggregate") {
        statements.push(...deleteAggregateStatements(def, deletion.id));
      } else {
        statements.push(deleteRowStatement(def, deletion.id));
      }
    }

    // Aggregates: one frame, one whole aggregate (§5.5).
    if (aggregateDef !== undefined && defs.children !== undefined) {
      const ids = page.aggregates.map((aggregate) =>
        String(aggregate.row[aggregateDef.pk]),
      );
      const locals = yield* readLocalAggregates(deps.db, group, ids);
      for (const aggregate of page.aggregates) {
        const id = String(aggregate.row[aggregateDef.pk]);
        const stored = locals.get(id);
        if (stored === undefined) {
          statements.push(
            ...upsertAggregateStatements(aggregateDef, aggregate.row, aggregate.children, aggregate.seq),
          );
          stats.applied += 1;
          continue;
        }
        const decision = decideAggregate(
          aggregateDef,
          defs.children,
          stored.header,
          stored.children,
          aggregate.row,
          aggregate.children,
        );
        stats[decision] += 1;
        if (decision === "applied") {
          statements.push(
            ...upsertAggregateStatements(aggregateDef, aggregate.row, aggregate.children, aggregate.seq),
          );
        } else if (decision === "noop") {
          statements.push(
            markAggregateSyncedStatement(
              aggregateDef,
              id,
              aggregate.seq,
              clockOf(aggregateDef, aggregate.row),
            ),
          );
        }
      }
    }

    // Row entities, in dependency order.
    const byEntity = new Map<string, PullChange[]>();
    for (const change of page.changes) {
      const list = byEntity.get(change.entity);
      if (list === undefined) byEntity.set(change.entity, [change]);
      else list.push(change);
    }

    const moneyDef = TABLES["money"];
    const pocketDef = TABLES["pocket"];
    const isMoneyGroup = group === "money" && moneyDef !== undefined && pocketDef !== undefined;
    // The park after this page. Only the money group ever changes it; every
    // other group passes the incoming park through untouched.
    let parkedNext: readonly ParkedMoney[] = parked;
    // The products whose journal (or catalogue row) actually changed on this
    // page — the only ones whose stock fold can be out of date afterwards.
    const appliedProducts = new Set<string>();
    const appliedEvents = new Set<string>();

    for (const def of defs.entities) {
      if (def.kind === "aggregate") continue;
      const changes = byEntity.get(def.entity) ?? [];

      if (isMoneyGroup && def.entity === "money") {
        // Pass 2: money, parked when its pocket is not known.
        const knownPockets = new Set<string>(local.get("pocket")?.keys() ?? []);
        for (const change of byEntity.get("pocket") ?? []) {
          knownPockets.add(String(change.row["pocket_id"]));
        }
        // Keyed by `money_id`, so a page re-pulled after a crash (the bookmark
        // only moves on commit) parks the same row once, not once per attempt.
        const stillParked = new Map<string, ParkedMoney>();
        const writeMoney = (row: WireRow, seq: number): void => {
          const id = idOf(moneyDef, row);
          if (!knownPockets.has(String(row["pocket_id"]))) {
            stillParked.set(id, { seq, row });
            return;
          }
          stillParked.delete(id);
          planRow(moneyDef, local.get("money")?.get(id), row, seq, statements, stats);
        };
        // The park from earlier pages first: their pocket may have just arrived.
        for (const waiting of parked) writeMoney(waiting.row, waiting.seq);
        for (const change of changes) writeMoney(change.row, change.seq);
        stats.parked = stillParked.size;
        parkedNext = [...stillParked.values()];
        continue;
      }

      for (const change of changes) {
        const stored = local.get(def.entity)?.get(idOf(def, change.row));
        const decision = planRow(def, stored, change.row, change.seq, statements, stats);
        // A row that changed nothing needs nothing folded: a page of five
        // thousand catalogue rows that this device already had is not a reason to
        // re-derive five thousand stock lots.
        if (decision !== "applied") continue;
        if (def.entity === "product") {
          appliedProducts.add(String(change.row["product_id"]));
        } else if (def.entity === "product_event" && change.row["product_id"] != null) {
          appliedEvents.add(String(change.row["product_id"]));
        }
      }
    }

    // The product group's `stocks` is a projection of the journal, not a synced
    // table (§8.7). A product whose events arrived is re-folded from the local
    // journal in the same transaction, so a device that pulled another till's sale
    // shows the right stock immediately.
    //
    // A product whose *row* arrived is only folded when a lot of its journal has
    // no `stocks` row yet — the one hole the fold can leave behind, because it
    // skips a lot whose product is not on the device. Everything else (the other
    // four thousand rows of a catalogue page) was folded when its events landed,
    // and re-deriving it costs seconds per page on a shop-sized journal.
    if (group === "product") {
      const unfolded =
        appliedProducts.size === 0
          ? []
          : yield* productsWithUnfoldedLots(deps.db, [...appliedProducts]);
      statements.push(
        ...(yield* stockFoldStatements(deps.db, [...appliedEvents, ...unfolded])),
      );
    }

    // §9.4.1: the rows, the parked rows and the bookmark are one transaction. A
    // crash between them would either re-fetch a page (harmless) or skip one
    // (unrecoverable), so they must never be written separately.
    if (commit !== undefined) {
      if (group === "money") statements.push(...parkedStatements(parkedNext));
      statements.push(bookmarkStatement(group, commit.bookmark));
    }

    yield* deps.execute(statements, group);
    return { stats, parked: [...parkedNext] };
  });
}

/**
 * Applies the server's winning row from a `stale` ack (merge point C, §5.8).
 *
 * The guard (`since`) is the clock this device uploaded: a row the cashier edited
 * after its frame left keeps the local value, stays unsynced, and is compared
 * again on the next pass. Without that, an edit made while the request was in
 * flight would be silently overwritten by the answer to the old one.
 */
export function staleStatements(
  def: EntityDef,
  children: readonly ChildDef[] | undefined,
  row: WireRow,
  ch: WireChildren | null,
  seq: number,
  since: number,
): MergeStatement[] {
  if (def.kind === "aggregate" && children !== undefined) {
    return forceAggregateStatements(def, row, ch ?? emptyAggregateChildren(children), seq, since);
  }
  return [forceUpsertStatement(def, row, seq, since)];
}
