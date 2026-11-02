/**
 * SQL for the money group — the statements the pull side merges with, the push
 * side reads from, and the reset path clears.
 *
 * Every statement is generated from the column dictionaries in `schema.ts`, so
 * a column added to a dictionary travels in both directions without a second
 * place to hand-edit. The sync service is the owner of the mirror statements; a
 * page never reaches this module.
 *
 * The guards are deliberate. The merge decision is made in TypeScript against a
 * row read moments earlier, but a cashier can edit that row between the read and
 * the write, so each write repeats the comparison in SQL — the row that lands is
 * the one that is still newest, whichever side of the race it came from.
 */
import type { Statement } from "../db";
import type { EntityDef, WireRow } from "./schema";

/** Columns written on insert, including the client-only sync marker. */
function insertColumns(def: EntityDef): string[] {
  return [...def.columns, def.syncAt];
}

/** Columns assigned on conflict — everything that can move. */
function updateColumns(def: EntityDef): string[] {
  return insertColumns(def).filter((column) => column !== def.pk);
}

function placeholders(count: number): string {
  return Array.from({ length: count }, (_, index) => `$${index + 1}`).join(", ");
}

function assignments(def: EntityDef): string {
  return updateColumns(def)
    .map((column) => `${column} = excluded.${column}`)
    .join(", ");
}

/** The row's values in canonical order, then the sync marker. */
function rowBindings(def: EntityDef, row: WireRow, syncAt: number): (string | number | null)[] {
  return [...def.columns.map((column) => row[column] ?? null), syncAt];
}

/**
 * Inserts a pulled row, or overwrites the local one when the incoming clock is
 * strictly newer (§8.2). A tie keeps the local row — the server applies the same
 * comparison, so a tie can only mean the two copies are the same change.
 *
 * `ON CONFLICT … DO UPDATE`, never `INSERT OR REPLACE`: replacing a pocket
 * deletes it first, and `money.pocket_id ON DELETE CASCADE` would take its money
 * rows with it.
 */
export function upsertIfNewerStatement(def: EntityDef, row: WireRow, syncAt: number): Statement {
  const columns = insertColumns(def);
  return {
    sql: `INSERT INTO ${def.table} (${columns.join(", ")}) VALUES (${placeholders(columns.length)})
      ON CONFLICT(${def.pk}) DO UPDATE SET ${assignments(def)}
      WHERE excluded.${def.updatedAt} > ${def.table}.${def.updatedAt}`,
    bindings: rowBindings(def, row, syncAt),
  };
}

/**
 * Writes the server's row over the local one, unconditionally except for one
 * guard: the local row must not have been edited after the frame was uploaded.
 *
 * This is merge point C (§11.2). For `money` it is the only path that can repair
 * a row whose immutable column a buggy build changed: the server's copy wins, so
 * the local row is rewritten even though its clock says otherwise.
 */
export function forceUpsertStatement(
  def: EntityDef,
  row: WireRow,
  syncAt: number,
  since: number,
): Statement {
  const columns = insertColumns(def);
  return {
    sql: `INSERT INTO ${def.table} (${columns.join(", ")}) VALUES (${placeholders(columns.length)})
      ON CONFLICT(${def.pk}) DO UPDATE SET ${assignments(def)}
      WHERE ${def.table}.${def.updatedAt} <= $${columns.length + 1}`,
    bindings: [...rowBindings(def, row, syncAt), since],
  };
}

/**
 * Marks a row the server already has as synced, without rewriting it.
 *
 * Guarded by the same clock: a row edited while its frame was in flight keeps its
 * `NULL` marker and is pushed again on the next pass.
 */
export function markSyncedStatement(
  def: EntityDef,
  id: string,
  seq: number,
  since: number,
): Statement {
  return {
    sql: `UPDATE ${def.table} SET ${def.syncAt} = $1
      WHERE ${def.pk} = $2 AND ${def.updatedAt} <= $3`,
    bindings: [seq, id, since],
  };
}

/** `del` frames (§9.3): the row is gone, so delete the local one. */
export function deleteRowStatement(def: EntityDef, id: string): Statement {
  return { sql: `DELETE FROM ${def.table} WHERE ${def.pk} = $1`, bindings: [id] };
}

/** `SELECT` of the local rows for a set of ids, in canonical order. */
export function selectByIdsSql(
  def: EntityDef,
  ids: readonly string[],
): { sql: string; bindings: (string | number | null)[] } {
  const list = ids.map((_, index) => `$${index + 1}`).join(", ");
  return {
    sql: `SELECT ${def.columns.join(", ")} FROM ${def.table} WHERE ${def.pk} IN (${list})`,
    bindings: [...ids],
  };
}

/**
 * The rows this device still owes the server (§7.4), oldest first.
 *
 * `*_sync_at IS NULL` is the whole dirty flag: a local write clears it, an ack
 * sets it to the server's `seq`.
 */
export function selectUnsyncedSql(def: EntityDef, limit: number): string {
  const order = def.entity === "pocket" ? "pocket_ordering, pocket_id" : "timestamp, money_id";
  return `SELECT ${def.columns.join(", ")} FROM ${def.table}
    WHERE ${def.syncAt} IS NULL
    ORDER BY ${order}
    LIMIT ${limit}`;
}

/** How many rows an entity still owes the server, for progress reporting. */
export function countUnsyncedSql(def: EntityDef): string {
  return `SELECT COUNT(*) AS total FROM ${def.table} WHERE ${def.syncAt} IS NULL`;
}

/**
 * `Sinkronisasi Ulang`: queue every row of the group for push (§11.5, and the
 * backfill note in §17.2.2 — rows written before v2 existed have no server-side
 * counterpart, so this is how they get one).
 */
export function markAllUnsyncedStatements(): Statement[] {
  return [
    { sql: "UPDATE pockets SET pocket_sync_at = NULL" },
    { sql: "UPDATE money SET money_sync_at = NULL" },
  ];
}

/**
 * The other half of a `400`/`410` recovery: drop what this device *believes* it
 * already synced and pull the group again from zero (§6.6).
 *
 * Unsynced rows survive — they are the device's own work and are re-pushed
 * afterwards. The second statement keeps a pocket whose money rows are still
 * unsynced: deleting it would cascade them away, and they have no wire form.
 */
export function discardSyncedStatements(): Statement[] {
  return [
    { sql: "DELETE FROM money WHERE money_sync_at IS NOT NULL" },
    {
      sql: `DELETE FROM pockets
        WHERE pocket_sync_at IS NOT NULL
          AND pocket_id NOT IN (SELECT pocket_id FROM money)`,
    },
  ];
}
