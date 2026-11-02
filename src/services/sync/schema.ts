/**
 * The v2 money-group wire schema (`SYNC-V2-MONEY.md` §3.3).
 *
 * The group is two tables and nothing else: `pockets` and `money`. Every other
 * table in this app is local for now — adding one means adding a group with its
 * own bookmark, not widening this dictionary.
 *
 * The column order is frozen here because the server serialises a row in exactly
 * this order (§3.3) and re-serialises whatever a client sends. Our encoder walks
 * these arrays, so the order cannot drift with a query, a view or a driver.
 *
 * `*_sync_at` is deliberately **not** a wire column: it is this device's own
 * bookkeeping (`NULL` = still owes the server a push) and never crosses the wire
 * (§3.2).
 */

/** The entities of the money group, in push order: every pocket before any money. */
export const ENTITY_ORDER = ["pocket", "money"] as const;

export type Entity = (typeof ENTITY_ORDER)[number];

/** One table's contract: where it lives, how it is keyed, what travels. */
export type EntityDef = {
  entity: Entity;
  table: string;
  /** Primary-key column, and the object key the server frames use for it. */
  pk: string;
  /** Canonical column order (§3.3). Never shared between tables. */
  columns: readonly string[];
  /** Columns that may be `null`; every other column is NOT NULL. */
  nullable: readonly string[];
  /** The merge clock (§8.2). */
  updatedAt: string;
  /** Soft-delete tombstone (§9). */
  deletedAt: string;
  /** Push bookkeeping; never crosses the wire (§3.2). */
  syncAt: string;
};

export const TABLES: Record<Entity, EntityDef> = {
  pocket: {
    entity: "pocket",
    table: "pockets",
    pk: "pocket_id",
    columns: [
      "pocket_id",
      "pocket_name",
      "pocket_type",
      "pocket_ordering",
      "pocket_updated_at",
      "pocket_deleted_at",
    ],
    nullable: ["pocket_deleted_at"],
    updatedAt: "pocket_updated_at",
    deletedAt: "pocket_deleted_at",
    syncAt: "pocket_sync_at",
  },
  money: {
    entity: "money",
    table: "money",
    pk: "money_id",
    columns: [
      "money_id",
      "timestamp",
      "money_value",
      "pocket_id",
      "money_note",
      "money_updated_at",
      "money_deleted_at",
    ],
    nullable: ["money_deleted_at"],
    updatedAt: "money_updated_at",
    deletedAt: "money_deleted_at",
    syncAt: "money_sync_at",
  },
};

/** Every table the group touches, in push order. */
export const SYNC_TABLES = ENTITY_ORDER.map((entity) => TABLES[entity]);

/**
 * A wire value. The protocol carries strings, finite numbers and explicit
 * `null` — nothing else (§4.2).
 */
export type WireValue = string | number | null;

/** A canonical row, keyed in `columns` order. */
export type WireRow = Record<string, WireValue>;

export function isEntity(value: unknown): value is Entity {
  return typeof value === "string" && (ENTITY_ORDER as readonly string[]).includes(value);
}

/**
 * Coerces one driver/JSON value to a wire value.
 *
 * `undefined` is the dangerous one: `JSON.stringify` drops the key silently, and
 * the server then reports `bad_frame` for a row that looked complete here.
 */
export function normalize(value: unknown, nullable: boolean): WireValue {
  if (value === undefined || value === null) {
    if (nullable) return null;
    throw new Error("Kolom wajib tidak boleh kosong saat menyusun data sinkronisasi");
  }
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Nilai angka tidak valid saat menyusun data sinkronisasi");
    }
    return value;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  throw new Error("Tipe data tidak dikenal saat menyusun data sinkronisasi");
}

/**
 * Builds a canonical row from an arbitrary record, in the table's column order,
 * with explicit `null` for an absent nullable column.
 *
 * Used on both sides of the wire: for a row read out of SQLite (push) and for a
 * row parsed out of a server frame (pull).
 */
export function toCanonicalRow(def: EntityDef, source: Record<string, unknown>): WireRow {
  const row: WireRow = {};
  for (const column of def.columns) {
    row[column] = normalize(source[column], def.nullable.includes(column));
  }
  return row;
}

/** `SELECT` list for a table, in canonical order. */
export function selectColumns(def: EntityDef): string {
  return def.columns.join(", ");
}

/** The primary-key value of a row, as a string. */
export function idOf(def: EntityDef, row: WireRow): string {
  return String(row[def.pk]);
}

/** The merge clock of a row, as a number. */
export function clockOf(def: EntityDef, row: WireRow): number {
  return Number(row[def.updatedAt]);
}
