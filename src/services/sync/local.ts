/**
 * Local-database access for the sync service: the push set and the rows behind
 * it, the child arrays of a record aggregate, and the marker writes.
 *
 * These are `DatabaseService` calls, so they obey the same write path as every
 * domain service; the sync service owns them because it owns the mirror. The
 * domain services are refreshed after a merge (`live.ts`) so the refs the UI
 * reads never go stale.
 */
import { Context, Effect } from "effect";
import type { DatabaseService } from "../db";
import { SyncError } from "./index";
import {
  CHILDREN,
  TABLES,
  toCanonicalChild,
  toCanonicalRow,
  type Entity,
  type EntityDef,
  type WireRow,
} from "./schema";
import {
  countRowsSql,
  markSyncedStatements,
  recordAggregateStatements,
  selectChildrenSql,
  selectRowsSql,
} from "./sql";

/** Bound on `IN (...)` lists so a huge resync cannot exceed SQLite's variable cap. */
const IN_CHUNK = 400;

/** The database service's shape, as the sync statements use it. */
type DatabaseServiceImpl = Context.Tag.Service<typeof DatabaseService>;

/** Turns a driver failure into the service's error, without leaking SQL text. */
function dbError(entity: Entity | "local", error: { message: string }): SyncError {
  return new SyncError({
    message: `Sinkronisasi ${entity} gagal disimpan: ${error.message}`,
  });
}

/** Reads rows and shapes them into canonical order. */
function readRows(
  db: DatabaseServiceImpl,
  def: EntityDef,
): Effect.Effect<WireRow[], SyncError> {
  return db.selectMany<Record<string, unknown>>(selectRowsSql(def)).pipe(
    Effect.mapError((error) => dbError(def.entity, error)),
    Effect.map((rows) => rows.map((row) => toCanonicalRow(def, row))),
  );
}

/** How many rows an entity still owes the server, for progress reporting. */
export function countUnsynced(
  db: DatabaseServiceImpl,
  def: EntityDef,
): Effect.Effect<number, SyncError> {
  return db.selectMany<{ total: number }>(countRowsSql(def)).pipe(
    Effect.mapError((error) => dbError(def.entity, error)),
    Effect.map((rows) => rows[0]?.total ?? 0),
  );
}

/** The frame payload for one entity: row frames, or one aggregate per record. */
export type EncodedFrame = {
  entity: Entity;
  /** Primary key of the row (or the record header) the frame carries. */
  id: string;
  /** The frame's merge clock — echoed back so an ack can be matched. */
  updatedAt: number;
  line: string;
};

/**
 * Encodes every unsynced row of one entity, in wire order.
 *
 * A `record` entity becomes one aggregate frame per header, with all five child
 * arrays loaded in bulk (five queries per page of ids, not five per record —
 * a full resync is thousands of records).
 */
export function encodeEntityFrames(
  db: DatabaseServiceImpl,
  def: EntityDef,
  encodeRow: (entity: Entity, row: WireRow) => string,
  encodeRecord: (row: WireRow, children: Record<string, WireRow[]>) => string,
): Effect.Effect<EncodedFrame[], SyncError> {
  return Effect.gen(function* () {
    const rows = yield* readRows(db, def);
    if (rows.length === 0) return [];
    if (def.entity !== "record") {
      return rows.map((row) => ({
        entity: def.entity,
        id: String(row[def.pk]),
        updatedAt: Number(row[def.updatedAt]),
        line: encodeRow(def.entity, row),
      }));
    }

    const ids = rows.map((row) => String(row[def.pk]));
    const children = yield* readChildren(db, ids);
    return rows.map((row) => {
      const id = String(row[def.pk]);
      return {
        entity: def.entity,
        id,
        updatedAt: Number(row[def.updatedAt]),
        line: encodeRecord(row, children.get(id) ?? emptyChildren()),
      };
    });
  });
}

function emptyChildren(): Record<string, WireRow[]> {
  const children: Record<string, WireRow[]> = {};
  for (const child of CHILDREN) children[child.key] = [];
  return children;
}

/** The five child arrays for each of `recordIds`, in `CHILD_ORDER`. */
export function readChildren(
  db: DatabaseServiceImpl,
  recordIds: readonly string[],
): Effect.Effect<Map<string, Record<string, WireRow[]>>, SyncError> {
  return Effect.gen(function* () {
    const byRecord = new Map<string, Record<string, WireRow[]>>();
    for (const recordId of recordIds) byRecord.set(recordId, emptyChildren());

    for (const child of CHILDREN) {
      for (let start = 0; start < recordIds.length; start += IN_CHUNK) {
        const slice = recordIds.slice(start, start + IN_CHUNK);
        const { sql, bindings } = selectChildrenSql(child, [...slice]);
        const rows = yield* db
          .selectMany<Record<string, unknown>>(sql, bindings)
          .pipe(Effect.mapError((error) => dbError("record", error)));
        for (const row of rows) {
          // `record_id` is selected by `selectChildrenSql` for every child kind.
          const bucket = byRecord.get(String(row["record_id"] ?? ""));
          if (bucket === undefined) continue;
          bucket[child.key]!.push(toCanonicalChild(child, row));
        }
      }
    }

    return byRecord;
  });
}

/** Marks rows synced after the server acknowledges them (§5.3). */
export function markSynced(
  db: DatabaseServiceImpl,
  entity: Entity,
  entries: readonly { id: string; updatedAt: number }[],
  syncedAt: number,
): Effect.Effect<void, SyncError> {
  if (entries.length === 0) return Effect.void;
  const def = TABLES[entity];
  const statements = markSyncedStatements(def, [...entries], syncedAt);
  return db
    .transaction(statements)
    .pipe(Effect.mapError((error) => dbError(entity, error)));
}

/**
 * Writes one merged `record` aggregate (§5.2). Split out of the generic merge so
 * a caller that has to decide whether the header wins can read the local clock
 * first and then hand over a ready statement list.
 */
export function writeRecordAggregate(
  db: DatabaseServiceImpl,
  row: WireRow,
  children: Record<string, WireRow[]>,
  options: { force: boolean; syncedAt: number },
): Effect.Effect<void, SyncError> {
  const statements = recordAggregateStatements(row, children, options.syncedAt, {
    force: options.force,
  });
  return db
    .transaction(statements)
    .pipe(Effect.mapError((error) => dbError("record", error)));
}
