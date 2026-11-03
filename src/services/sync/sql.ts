/**
 * SQL for every sync group — the statements the pull side merges with, the push
 * side reads from, and the reset path clears.
 *
 * Every statement is generated from the column dictionaries in `schema.ts`, so a
 * column added to a dictionary travels in both directions without a second place
 * to hand-edit. Nothing here knows an entity by name; the caller passes the def.
 *
 * The guards are deliberate. The merge decision is made in TypeScript against a
 * row read moments earlier, but a cashier can edit that row between the read and
 * the write, so each write repeats the comparison in SQL — the row that lands is
 * the one that is still newest, whichever side of the race it came from.
 *
 * A record is one aggregate: the header upsert and the wholesale replacement of
 * its five child sets are guarded by the header clock the incoming frame carried,
 * so a concurrent local edit cannot leave a newer header with an older child set.
 */
import type { Statement } from "../db";
import {
  GROUPS,
  RECORD_CHILD_TABLES,
  type ChildDef,
  type EntityDef,
  type SyncGroup,
  type WireChildren,
  type WireRow,
} from "./schema";

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
 * strictly newer (§5.2). A tie keeps the local row — the server applies the same
 * comparison, so a tie can only mean the two copies are the same change.
 *
 * `ON CONFLICT … DO UPDATE`, never `INSERT OR REPLACE`: replacing a pocket
 * deletes it first, and `money.pocket_id ON DELETE CASCADE` would take its money
 * rows with it.
 */
export function upsertIfNewerStatement(def: EntityDef, row: WireRow, syncAt: number): Statement {
  const columns = insertColumns(def);
  const clock = def.updatedAt ?? def.pk;
  return {
    sql: `INSERT INTO ${def.table} (${columns.join(", ")}) VALUES (${placeholders(columns.length)})
      ON CONFLICT(${def.pk}) DO UPDATE SET ${assignments(def)}
      WHERE excluded.${clock} > ${def.table}.${clock}`,
    bindings: rowBindings(def, row, syncAt),
  };
}

/**
 * Append-only insert (`product_event`): the id is the whole identity, so an
 * existing row is left exactly as it is (§5.3).
 */
export function insertIfAbsentStatement(def: EntityDef, row: WireRow, syncAt: number): Statement {
  const columns = insertColumns(def);
  return {
    sql: `INSERT INTO ${def.table} (${columns.join(", ")}) VALUES (${placeholders(columns.length)})
      ON CONFLICT(${def.pk}) DO NOTHING`,
    bindings: rowBindings(def, row, syncAt),
  };
}

/**
 * Writes the server's row over the local one, unconditionally except for one
 * guard: the local row must not have been edited after the frame was uploaded.
 *
 * This is merge point C (§5.8). For `money` it is the only path that can repair
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
  const clock = def.updatedAt ?? def.pk;
  return {
    sql: `INSERT INTO ${def.table} (${columns.join(", ")}) VALUES (${placeholders(columns.length)})
      ON CONFLICT(${def.pk}) DO UPDATE SET ${assignments(def)}
      WHERE ${def.table}.${clock} <= $${columns.length + 1}`,
    bindings: [...rowBindings(def, row, syncAt), since],
  };
}

/**
 * Marks a row the server already has as synced, without rewriting it.
 *
 * Guarded by the same clock: a row edited while its frame was in flight keeps its
 * `NULL` marker and is pushed again on the next pass (§4.12).
 */
export function markSyncedStatement(
  def: EntityDef,
  id: string,
  seq: number,
  since: number,
): Statement {
  const clock = def.updatedAt;
  if (clock === null) {
    // Append-only rows have no clock to compare: their ack applies unconditionally
    // (§4.12 — nothing can be lost, the id is the whole row).
    return {
      sql: `UPDATE ${def.table} SET ${def.syncAt} = $1 WHERE ${def.pk} = $2`,
      bindings: [seq, id],
    };
  }
  return {
    sql: `UPDATE ${def.table} SET ${def.syncAt} = $1
      WHERE ${def.pk} = $2 AND ${clock} <= $3`,
    bindings: [seq, id, since],
  };
}

/** `del` frames (§6): the row is gone, so delete the local one. */
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
 * The rows this device still owes the server (§4.1), in the group's order.
 *
 * `*_sync_at IS NULL` is the whole dirty flag: a local write clears it, an ack
 * sets it to the server's `seq`.
 */
export function selectUnsyncedSql(def: EntityDef, limit: number): string {
  return `SELECT ${def.columns.join(", ")} FROM ${def.table}
    WHERE ${def.syncAt} IS NULL
    ORDER BY ${def.order}
    LIMIT ${limit}`;
}

/** How many rows an entity still owes the server, for progress reporting. */
export function countUnsyncedSql(def: EntityDef): string {
  return `SELECT COUNT(*) AS total FROM ${def.table} WHERE ${def.syncAt} IS NULL`;
}

// ============================================================================
// The record aggregate (§5.5, §8.8)
// ============================================================================

/**
 * Deletes one child set for a record, but only while the header still carries the
 * clock the incoming aggregate had. After the header upsert that is exactly the
 * condition "the incoming aggregate won"; a concurrent local edit bumps the
 * header past it and the child set is left alone.
 */
function deleteChildrenStatement(child: ChildDef, recordId: string, clock: number): Statement {
  const scope =
    child.via === "record"
      ? `record_id = $1`
      : `record_listing_id IN (SELECT record_listing_id FROM record_listings WHERE record_id = $1)`;
  return {
    sql: `DELETE FROM ${child.table} WHERE ${scope}
      AND EXISTS (
        SELECT 1 FROM records WHERE record_id = $1 AND record_updated_at = $2
      )`,
    bindings: [recordId, clock],
  };
}

/**
 * Inserts one child row, guarded by the same header clock so a stale child set
 * cannot land over a newer header.
 *
 * A child that reaches its record through `record_id` has that column filled in
 * here; a `discounts` row names its listing instead, and the listing names the
 * record.
 */
function insertChildStatement(child: ChildDef, row: WireRow, recordId: string, clock: number): Statement {
  const columns = child.via === "record" ? ["record_id", ...child.columns] : [...child.columns];
  const values =
    child.via === "record"
      ? [recordId, ...child.columns.map((column) => row[column] ?? null)]
      : child.columns.map((column) => row[column] ?? null);
  const placeholdersList = values.map((_, index) => `$${index + 1}`).join(", ");
  return {
    sql: `INSERT INTO ${child.table} (${columns.join(", ")})
      SELECT ${placeholdersList}
      WHERE EXISTS (
        SELECT 1 FROM records WHERE record_id = $${values.length + 1} AND record_updated_at = $${values.length + 2}
      )`,
    bindings: [...values, recordId, clock],
  };
}

/** Child tables in the order a delete must visit them (dependants first). */
function childDeletionOrder(): ChildDef[] {
  const byKey = new Map(RECORD_CHILD_TABLES.map((child) => [child.key, child]));
  const order = ["discounts", "record_listings", "record_methods", "record_extras", "record_images"];
  return order.map((key) => {
    const child = byKey.get(key);
    if (child === undefined) throw new Error(`anak rekaman tidak dikenal: ${key}`);
    return child;
  });
}

/** Child tables in the order an insert must visit them (parents first). */
function childInsertionOrder(): ChildDef[] {
  const byKey = new Map(RECORD_CHILD_TABLES.map((child) => [child.key, child]));
  const order = ["record_listings", "discounts", "record_methods", "record_extras", "record_images"];
  return order.map((key) => {
    const child = byKey.get(key);
    if (child === undefined) throw new Error(`anak rekaman tidak dikenal: ${key}`);
    return child;
  });
}

/**
 * Drops a `discounts` row whose listing is not in the same aggregate.
 *
 * A discount is reached through its listing, so one with a missing listing cannot
 * be attached to a record locally (and the local key is a real foreign key).
 * §7.3 tolerates the reference; the honest local reading is to keep the rest of
 * the aggregate and drop the unattachable row rather than fail the page.
 */
function sanitizeChildren(children: WireChildren): WireChildren {
  const discounts = children["discounts"] ?? [];
  if (discounts.length === 0) return children;
  const listings = new Set(
    (children["record_listings"] ?? []).map((row) => String(row["record_listing_id"])),
  );
  const kept = discounts.filter((row) => listings.has(String(row["record_listing_id"])));
  if (kept.length === discounts.length) return children;
  return { ...children, discounts: kept };
}

/**
 * Replaces a record's whole aggregate: the header (if the incoming clock is
 * newer) and all five child sets, in one transaction (§5.5).
 *
 * A child omitted from `children` is deleted: the sets are replaced wholesale,
 * not merged.
 */
export function upsertAggregateStatements(
  def: EntityDef,
  header: WireRow,
  children: WireChildren,
  seq: number,
): Statement[] {
  const id = String(header[def.pk]);
  const clock = Number(header[def.updatedAt ?? def.pk]);
  const incoming = sanitizeChildren(children);
  const statements: Statement[] = [upsertIfNewerStatement(def, header, seq)];
  for (const child of childDeletionOrder()) {
    statements.push(deleteChildrenStatement(child, id, clock));
  }
  for (const child of childInsertionOrder()) {
    for (const row of incoming[child.key] ?? []) {
      statements.push(insertChildStatement(child, row, id, clock));
    }
  }
  return statements;
}

/**
 * Writes the server's winning aggregate over the local one (merge point C),
 * guarded only by the clock this device uploaded (§4.12).
 */
export function forceAggregateStatements(
  def: EntityDef,
  header: WireRow,
  children: WireChildren,
  seq: number,
  since: number,
): Statement[] {
  const id = String(header[def.pk]);
  const clock = Number(header[def.updatedAt ?? def.pk]);
  const incoming = sanitizeChildren(children);
  const statements: Statement[] = [forceUpsertStatement(def, header, seq, since)];
  for (const child of childDeletionOrder()) {
    statements.push(deleteChildrenStatement(child, id, clock));
  }
  for (const child of childInsertionOrder()) {
    for (const row of incoming[child.key] ?? []) {
      statements.push(insertChildStatement(child, row, id, clock));
    }
  }
  return statements;
}

/** Marks a record synced without rewriting it — the `applied`/`noop` ack. */
export function markAggregateSyncedStatement(
  def: EntityDef,
  id: string,
  seq: number,
  since: number,
): Statement {
  return markSyncedStatement(def, id, seq, since);
}

/** The dirty record headers, oldest clock first, within the frame bound. */
export function selectUnsyncedAggregateSql(def: EntityDef, limit: number): string {
  return `SELECT ${def.columns.join(", ")} FROM ${def.table}
    WHERE ${def.syncAt} IS NULL
    ORDER BY ${def.order}
    LIMIT ${limit}`;
}

/** Reads one record's five child sets, in canonical order. */
export function selectChildrenSql(child: ChildDef): string {
  if (child.via === "listing") {
    return `SELECT d.${child.columns.join(", d.")} FROM ${child.table} d
      JOIN record_listings l ON l.record_listing_id = d.record_listing_id
      WHERE l.record_id = $1
      ORDER BY d.${child.pk}`;
  }
  return `SELECT ${child.columns.join(", ")} FROM ${child.table}
    WHERE record_id = $1
    ORDER BY ${child.pk}`;
}

/** Reads many records' children at once, for a pull page's local comparison. */
export function selectChildrenByRecordsSql(child: ChildDef, count: number): string {
  const list = Array.from({ length: count }, (_, index) => `$${index + 1}`).join(", ");
  if (child.via === "listing") {
    return `SELECT l.record_id, d.${child.columns.join(", d.")} FROM ${child.table} d
      JOIN record_listings l ON l.record_listing_id = d.record_listing_id
      WHERE l.record_id IN (${list})
      ORDER BY l.record_id, d.${child.pk}`;
  }
  return `SELECT record_id, ${child.columns.join(", ")} FROM ${child.table}
    WHERE record_id IN (${list})
    ORDER BY record_id, ${child.pk}`;
}

/** Deletes a record and all its children (`del` frames, §6). */
export function deleteAggregateStatements(def: EntityDef, id: string): Statement[] {
  const statements: Statement[] = [];
  for (const child of childDeletionOrder()) {
    const scope =
      child.via === "record"
        ? `record_id = $1`
        : `record_listing_id IN (SELECT record_listing_id FROM record_listings WHERE record_id = $1)`;
    statements.push({ sql: `DELETE FROM ${child.table} WHERE ${scope}`, bindings: [id] });
  }
  statements.push({ sql: `DELETE FROM ${def.table} WHERE ${def.pk} = $1`, bindings: [id] });
  return statements;
}

// ============================================================================
// The product stock projection (§8.7)
// ============================================================================

/** Bound on one rebuild's `IN (...)` list, well under SQLite's variable cap. */
const STOCK_CHUNK = 200;

function stockChunks(ids: readonly string[]): string[][] {
  const out: string[][] = [];
  for (let start = 0; start < ids.length; start += STOCK_CHUNK) {
    out.push(ids.slice(start, start + STOCK_CHUNK));
  }
  return out;
}

/**
 * Rebuilds the local `stocks` cache from the append-only journal.
 *
 * `stocks` is not synced: it is a projection of `product_events` (§8.7). A device
 * that pulls events has to fold them back into lots, or its catalogue would show
 * no stock for a product another till sold. The replay is per lot:
 *
 * - `stock_value` = the sum of the lot's signed deltas;
 * - `stock_capital` = the newest event's capital (a capital correction is a
 *   delta-0 event, so the newest one is the lot's current cost);
 * - `stock_created_at` = the oldest event's time.
 *
 * Only lots that have at least one event are touched, so a lot the journal never
 * described (a pre-journal balance) is left exactly as it is. Products that have
 * not arrived yet are skipped, so a child-before-parent page cannot trip the
 * `stocks.product_id` foreign key.
 *
 * Idempotent: the delete and the re-insert are in one statement pair, and the
 * fold is over the whole journal for the lot, so re-pulling a page recomputes the
 * same rows.
 */
export function rebuildStockStatements(productIds: readonly string[]): Statement[] {
  const statements: Statement[] = [];
  for (const slice of stockChunks(productIds)) {
    if (slice.length === 0) continue;
    const list = slice.map((_, index) => `$${index + 1}`).join(", ");
    statements.push({
      sql: `DELETE FROM stocks
        WHERE product_id IN (${list})
          AND stock_id IN (
            SELECT stock_id FROM product_events
            WHERE product_id IN (${list}) AND stock_id IS NOT NULL
          )`,
      bindings: [...slice],
    });
    statements.push({
      // `stock_updated_at` is the newest event's time, not a bound `now`: a
      // local cache timestamp does not need the wall clock, and mixing a bound
      // value into an INSERT…SELECT projection is not portable across drivers.
      sql: `INSERT INTO stocks (
          stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
        )
        SELECT
          e.stock_id,
          e.product_id,
          (SELECT SUM(v.product_event_value) FROM product_events v WHERE v.stock_id = e.stock_id),
          e.product_event_capital,
          (SELECT MIN(m.product_event_created_at) FROM product_events m WHERE m.stock_id = e.stock_id),
          (SELECT MAX(m.product_event_created_at) FROM product_events m WHERE m.stock_id = e.stock_id)
        FROM product_events e
        WHERE e.stock_id IS NOT NULL
          AND e.product_id IN (${list})
          AND EXISTS (SELECT 1 FROM products p WHERE p.product_id = e.product_id)
          AND NOT EXISTS (
            SELECT 1 FROM product_events n
            WHERE n.stock_id = e.stock_id
              AND (
                n.product_event_created_at > e.product_event_created_at
                OR (n.product_event_created_at = e.product_event_created_at
                    AND n.product_event_id > e.product_event_id)
              )
          )`,
      bindings: [...slice],
    });
  }
  return statements;
}

// ============================================================================
// Reset and seeding (§9.8, §13.4)
// ============================================================================

/**
 * Marks every row of the group dirty, keeping its content and its clock.
 *
 * This is both halves of the contract's one procedure: `Sinkronisasi Ulang`
 * (seeding a device) and the automatic re-seed on a pull `400`/`410`. A dirty row
 * stays dirty; a synced one becomes dirty again. Nothing is deleted.
 *
 * The record group marks its headers only — the five child tables have no flag
 * and travel with the header (§9.1).
 */
export function markAllUnsyncedStatements(group: SyncGroup): Statement[] {
  return GROUPS[group].entities.map((def) => ({
    sql: `UPDATE ${def.table} SET ${def.syncAt} = NULL`,
  }));
}

/**
 * Forgets that the server has this device's image bytes (§8.7.1).
 *
 * Part of both re-seeds: a `400`/`410` on the `product` group means the server's
 * copy of that group came from somewhere else, and a server that lost the log may
 * have lost the objects with it — the row's `image_blob_sync_at` would then be a
 * promise about bytes nobody has. Clearing it re-claims them, one small `PUT` per
 * image; content addressing makes a repeat upload a `200` and one object on disk.
 *
 * Only the marker is cleared: `image_blob_version` and the digest still say which
 * bytes the local file holds, so rows whose clock moved on are fetched instead.
 */
export function forgetUploadedBlobsStatement(): Statement {
  return {
    sql: "UPDATE images SET image_blob_sync_at = NULL WHERE image_deleted_at IS NULL",
  };
}

/**
 * The group's bookmark, written in the same transaction as the page it covers
 * (§9.4.1).
 */
export function bookmarkStatement(group: SyncGroup, seq: number): Statement {
  return {
    sql: `INSERT INTO sync_bookmark (group_name, seq) VALUES ($1, $2)
      ON CONFLICT(group_name) DO UPDATE SET seq = excluded.seq`,
    bindings: [group, seq],
  };
}

/**
 * Replaces the parked-money table with the current park (§7.5).
 *
 * Parked rows are persisted with the bookmark of the page that parked them, so a
 * crash neither loses them nor replays them past their page. The table is small
 * by construction — a park only holds money rows whose pocket has not arrived.
 */
export function parkedStatements(parked: readonly { seq: number; row: WireRow }[]): Statement[] {
  const statements: Statement[] = [{ sql: "DELETE FROM sync_parked_money" }];
  for (const entry of parked) {
    statements.push({
      sql: "INSERT INTO sync_parked_money (money_id, seq, row_json) VALUES ($1, $2, $3)",
      bindings: [String(entry.row["money_id"]), entry.seq, JSON.stringify(entry.row)],
    });
  }
  return statements;
}
