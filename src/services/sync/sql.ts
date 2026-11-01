/**
 * SQL for the sync service — the statements the pull side merges with and the
 * push side reads from.
 *
 * The protocol is a full-row mirror, so every statement here is generated from
 * the column dictionaries in `schema.ts` rather than written per table. That is
 * also what keeps the wire and the database in step: a column added to a
 * dictionary travels in both directions without another statement to hand-edit.
 *
 * The "service-first" rule in the spec ("every merge/push has to go through the
 * owning service (or a new sync service), not SQL from a page") is what makes
 * this legitimate: the sync service *is* the owner of the mirror statements, and
 * it refreshes the domain services' refs after each batch (see `live.ts`). A page
 * never reaches this module.
 */
import type { Statement } from "../db";
import {
  CHILDREN,
  CHILD_ORDER,
  ENTITY_ORDER,
  SYNC_TABLES,
  TABLES,
  type ChildDef,
  type Entity,
  type EntityDef,
  type WireRow,
} from "./schema";

/** Columns written on insert, excluding the client-only sync marker. */
function insertColumns(def: EntityDef): string[] {
  return [...def.columns, def.syncAt];
}

/** Columns assigned on conflict, i.e. everything that can move. */
function updateColumns(def: EntityDef): string[] {
  return def.columns.filter((column) => column !== def.pk);
}

/**
 * One row, last-writer-wins (§6.2).
 *
 * `WHERE excluded.<updated_at> > <table>.<updated_at>` is the tie rule: an equal
 * timestamp keeps the local row, because the server applies the same comparison
 * and only reaches us as a `stale` ack when it won the tie. The sync marker moves
 * with the row, so a merged row is not pushed back (§3.1).
 */
export function mergeRowStatement(def: EntityDef, row: WireRow, syncedAt: number): Statement {
  const columns = insertColumns(def);
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  const assignments = [...updateColumns(def), def.syncAt]
    .map((column) => `${column} = excluded.${column}`)
    .join(", ");
  return {
    sql: `INSERT INTO ${def.table} (${columns.join(", ")}) VALUES (${placeholders})
      ON CONFLICT(${def.pk}) DO UPDATE SET ${assignments}
      WHERE excluded.${def.updatedAt} > ${def.table}.${def.updatedAt}`,
    bindings: [...def.columns.map((column) => row[column] ?? null), syncedAt],
  };
}

/**
 * One row, unconditionally — the shape used for a `stale` ack payload, where the
 * server has already decided it wins (§5.2 "merge that payload unconditionally").
 *
 * `onlyIfClock` is the exception to "unconditionally": the local row must still be
 * the one the client uploaded. A cashier can edit a row while its frame is in
 * flight, and the server's `stale` verdict was reached against the values that
 * frame carried — not against the edit that landed after it. Applying the payload
 * anyway would overwrite a newer local value *and* move `updated_at` past the
 * marker guard in `markSyncedStatements`, so the edit would never be pushed back
 * either. When the clocks differ the row keeps its local value, stays unsynced,
 * and the next push pass compares the two properly.
 *
 * A row that does not exist locally is still inserted: there is no edit to protect.
 */
export function forceRowStatement(
  def: EntityDef,
  row: WireRow,
  syncedAt: number,
  onlyIfClock?: number,
): Statement {
  const columns = insertColumns(def);
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  const assignments = [...updateColumns(def), def.syncAt]
    .map((column) => `${column} = excluded.${column}`)
    .join(", ");
  const bindings: (string | number | null)[] = [
    ...def.columns.map((column) => row[column] ?? null),
    syncedAt,
  ];
  if (onlyIfClock === undefined) {
    return {
      sql: `INSERT INTO ${def.table} (${columns.join(", ")}) VALUES (${placeholders})
        ON CONFLICT(${def.pk}) DO UPDATE SET ${assignments}`,
      bindings,
    };
  }
  bindings.push(onlyIfClock);
  return {
    sql: `INSERT INTO ${def.table} (${columns.join(", ")}) VALUES (${placeholders})
      ON CONFLICT(${def.pk}) DO UPDATE SET ${assignments}
      WHERE ${def.table}.${def.updatedAt} = $${bindings.length}`,
    bindings,
  };
}

/**
 * One `product_event`, appended (§6.3).
 *
 * `INSERT OR IGNORE` is the whole conflict rule: an event is immutable, so a
 * replayed id is a no-op rather than an update. The local row keeps its sync
 * marker when it already exists — it is either already synced or still queued
 * for a push, and the server acks `noop` for the replay.
 */
export function mergeEventStatement(def: EntityDef, row: WireRow, syncedAt: number): Statement {
  const columns = insertColumns(def);
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  return {
    sql: `INSERT OR IGNORE INTO ${def.table} (${columns.join(", ")}) VALUES (${placeholders})`,
    bindings: [...def.columns.map((column) => row[column] ?? null), syncedAt],
  };
}

function childInsert(
  def: ChildDef,
  row: WireRow,
  recordId: string,
  won: ((at: number) => string) | null,
  guard: readonly (string | number)[],
): Statement {
  const columns = [...def.columns];
  const bindings: (string | number | null)[] = def.columns.map((column) => row[column] ?? null);
  if (def.scope.kind === "record") {
    // `record_id` is inherited from the frame, so it is not on the wire.
    columns.push(def.scope.column);
    bindings.push(recordId);
  }
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  if (won === null) {
    return {
      sql: `INSERT INTO ${def.table} (${columns.join(", ")}) VALUES (${placeholders})`,
      bindings,
    };
  }
  // `SELECT … WHERE <header won>` inserts nothing when the header lost, which is
  // how §5.2 "if it loses, touch nothing" is enforced inside the transaction.
  const at = bindings.length + 1;
  bindings.push(...guard);
  return {
    sql: `INSERT INTO ${def.table} (${columns.join(", ")}) SELECT ${placeholders}
      WHERE ${won(at)}`,
    bindings,
  };
}

/**
 * A `record` frame: the header plus all five child arrays (§5.2).
 *
 * Order matters. The children are deleted deepest-first (`discounts` hangs off
 * `record_listings`) and inserted parent-first, so foreign keys hold at every
 * step.
 *
 * ## The guard
 *
 * Every child statement carries the same condition: *the header in the table is
 * the one this plan just wrote*. The header's own clock comparison lives in the
 * upsert (`excluded.<updated_at> > records.<updated_at>`, or `= $clock` for a
 * forced payload), but that comparison is evaluated while the statement runs — the
 * child rewrites run after it, in the same transaction, and must not replace the
 * arrays of a header that lost.
 *
 * Deciding it here rather than in TypeScript is what makes a local write during a
 * merge safe. The merge plans in JS from clocks read before the transaction, so a
 * JS-side decision would be about a row that may have changed by the time the SQL
 * runs — exactly the race a background sync makes routine. The row answers for
 * itself instead: a header this plan wrote carries this plan's `_sync_at` stamp and
 * the incoming clock, and no other writer can produce that pair. (A second merge in
 * the same millisecond would; it would then rewrite the children with the same
 * frame's values, which is what re-merging means and is why it is harmless.)
 */
export function recordAggregateStatements(
  row: WireRow,
  children: Record<string, WireRow[]>,
  syncedAt: number,
  options: { force: boolean; onlyIfClock?: number },
): Statement[] {
  const def = TABLES.record;
  const recordId = String(row[def.pk]);
  const incomingAt = Number(row[def.updatedAt]);
  const header = options.force
    ? forceRowStatement(def, row, syncedAt, options.onlyIfClock)
    : mergeRowStatement(def, row, syncedAt);

  /** "The header is mine": the record id, then this plan's stamp and clock. */
  const guard: (string | number)[] = [recordId, syncedAt, incomingAt];
  const won = (at: number): string =>
    `EXISTS (SELECT 1 FROM ${def.table} WHERE ${def.pk} = $${at}
      AND ${def.syncAt} = $${at + 1} AND ${def.updatedAt} = $${at + 2})`;
  const guardedDelete = (sql: string): Statement => ({
    sql: `${sql} AND ${won(2)}`,
    bindings: [recordId, ...guard],
  });

  const statements: Statement[] = [
    header,
    guardedDelete(`DELETE FROM discounts WHERE record_listing_id IN (
        SELECT record_listing_id FROM record_listings WHERE record_id = $1)`),
    guardedDelete("DELETE FROM record_listings WHERE record_id = $1"),
    guardedDelete("DELETE FROM record_methods WHERE record_id = $1"),
    guardedDelete("DELETE FROM record_extras WHERE record_id = $1"),
    guardedDelete("DELETE FROM record_images WHERE record_id = $1"),
  ];

  for (const key of CHILD_ORDER) {
    const def = CHILDREN.find((child) => child.key === key);
    if (def === undefined) continue;
    for (const child of children[key] ?? []) {
      statements.push(childInsert(def, child, recordId, won, guard));
    }
  }

  return statements;
}

/**
 * Marks rows the server has acknowledged (`applied` / `stale` / `noop`).
 *
 * The clock guard is what makes a write that lands *while* its frame is in flight
 * safe: if the row moved after it was encoded, its marker is left alone, so the
 * newer value is pushed on the next pass instead of being silently marked as
 * already sent. The append-only journal has no clock, only "has been sent".
 */
export function markSyncedStatements(
  def: EntityDef,
  entries: { id: string; updatedAt: number }[],
  syncedAt: number,
): Statement[] {
  if (def.deletedAt === null) {
    return entries.map((entry) => ({
      sql: `UPDATE ${def.table} SET ${def.syncAt} = $1 WHERE ${def.pk} = $2`,
      bindings: [syncedAt, entry.id],
    }));
  }
  return entries.map((entry) => ({
    sql: `UPDATE ${def.table} SET ${def.syncAt} = $1
      WHERE ${def.pk} = $2 AND ${def.updatedAt} = $3`,
    bindings: [syncedAt, entry.id, entry.updatedAt],
  }));
}

/** The push set: everything the server has not acknowledged since its last edit. */
export function unsyncWhere(def: EntityDef): string {
  if (def.deletedAt === null) {
    // Append-only journal: there is no merge clock, only "has it ever been sent".
    return `${def.syncAt} IS NULL`;
  }
  // "NULL or stale": a cleared marker means a local write; a marker older than
  // the row's clock means the row moved after it was pushed (§3.1).
  return `(${def.syncAt} IS NULL OR ${def.syncAt} < ${def.updatedAt})`;
}

export function unsyncOrderBy(def: EntityDef): string {
  // Primary key order is creation order for the ULIDs the app mints, and at
  // least deterministic for the legacy numeric-string ids, which is all the
  // parent-before-child guarantee needs (§2.3).
  if (def.entity === "product_event") {
    return `${def.updatedAt} ASC, ${def.pk} ASC`;
  }
  return `${def.pk} ASC`;
}

export function selectRowsSql(def: EntityDef): string {
  return `SELECT ${def.columns.join(", ")} FROM ${def.table}
    WHERE ${unsyncWhere(def)}
    ORDER BY ${unsyncOrderBy(def)}`;
}

export function countRowsSql(def: EntityDef): string {
  return `SELECT COUNT(*) AS total FROM ${def.table} WHERE ${unsyncWhere(def)}`;
}

/** Every syncable row, unsynced — `Sinkronisasi Ulang` (§3.2). */
export function resetSyncStatements(): Statement[] {
  return SYNC_TABLES.map((def) => ({
    sql: `UPDATE ${def.table} SET ${def.syncAt} = NULL`,
  }));
}

/**
 * Child rows for a set of record ids, one query per child table.
 *
 * The `record_id` is selected alongside the child's own columns so the caller can
 * bucket rows per aggregate without a second query. It comes from the row itself
 * for direct children, and from a join for `discounts`, which only know their
 * listing.
 */
export function selectChildrenSql(def: ChildDef, ids: string[]): { sql: string; bindings: string[] } {
  const placeholders = ids.map((_, index) => `$${index + 1}`).join(", ");
  const columns = def.columns.map((column) => `c.${column}`).join(", ");
  if (def.scope.kind === "record") {
    return {
      sql: `SELECT ${columns}, c.${def.scope.column} AS record_id
        FROM ${def.table} c WHERE c.${def.scope.column} IN (${placeholders})`,
      bindings: ids,
    };
  }
  return {
    sql: `SELECT ${columns}, l.record_id AS record_id
      FROM ${def.table} c
      JOIN ${def.scope.via} l ON l.${def.scope.column} = c.${def.scope.column}
      WHERE l.record_id IN (${placeholders})`,
    bindings: ids,
  };
}

/** Every entity's definition, in wire order. */
export function defs(): EntityDef[] {
  return ENTITY_ORDER.map((entity) => TABLES[entity]);
}

export function defOf(entity: Entity): EntityDef {
  return TABLES[entity];
}
