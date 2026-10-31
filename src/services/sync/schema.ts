/**
 * The canonical wire schema — the one place the sync protocol's column order
 * lives (contract §3, §4.2).
 *
 * Both the encoder (`frames.ts`, which reads SQLite rows and writes NDJSON) and
 * the merge statements (`merge.ts`) resolve columns through these dictionaries.
 * The order is frozen here on purpose: `JSON.stringify` follows a JS object's
 * insertion order, so any encoder that walked `Object.keys(row)` would emit a
 * different byte stream the moment a query, a view or a driver reordered its
 * columns — and every byte stream is verified against a sha256 chain (§7.3).
 *
 * A column is listed even when it is nullable: canonical JSON writes explicit
 * `null` for absent values (§4.2 rule 2), never omits the key.
 */

/** Syncable entities, in the fixed emission order of backend §2.3. */
export const ENTITY_ORDER = [
  "pocket",
  "money",
  "product",
  "product_name",
  "property",
  "listing",
  "image",
  "customer",
  "supplier",
  "extra",
  "method",
  "social",
  "product_event",
  "record",
] as const;

export type Entity = (typeof ENTITY_ORDER)[number];

/** One table's contract: where it lives, how it is keyed, what travels. */
export type EntityDef = {
  entity: Entity;
  table: string;
  /** Primary-key column, and the object key the server frames use for it. */
  pk: string;
  /** Canonical column order. Never shared between tables. */
  columns: readonly string[];
  /** Columns that may be `null`; every other column is NOT NULL. */
  nullable: readonly string[];
  /** Merge clock (§6.2). */
  updatedAt: string;
  /** Soft-delete tombstone (§6.2). `null` for append-only tables. */
  deletedAt: string | null;
  /** Push bookkeeping; never crosses the wire (§3). */
  syncAt: string;
};

/**
 * The record aggregate's children (§3.15). They travel inside the `record`
 * frame and are replaced wholesale, so they carry no sync metadata of their own.
 */
export type ChildDef = {
  /** Key inside the frame's `ch` object. */
  key: string;
  table: string;
  pk: string;
  columns: readonly string[];
  nullable: readonly string[];
  /**
   * How a child row finds its record.
   *
   * `record` children carry `record_id` themselves (inherited from the frame, not
   * repeated on the wire). `listing` children — `discounts` is the only one — hang
   * off `record_listings`, so they are read and bucketed through a join.
   */
  scope:
    | { kind: "record"; column: "record_id" }
    | { kind: "listing"; via: "record_listings"; column: "record_listing_id" };
};

export const CHILD_ORDER = [
  "record_listings",
  "record_methods",
  "record_extras",
  "record_images",
  "discounts",
] as const;

export const CHILDREN: readonly ChildDef[] = [
  {
    key: "record_listings",
    table: "record_listings",
    pk: "record_listing_id",
    columns: [
      "record_listing_id",
      "record_listing_group_id",
      "product_event_id",
      "product_id",
      "record_listing_name",
      "record_listing_kind",
      "record_listing_unit",
      "record_listing_price",
      "record_listing_qty",
      "record_listing_capital",
      "record_listing_total",
    ],
    nullable: ["product_event_id", "product_id"],
    scope: { kind: "record", column: "record_id" },
  },
  {
    key: "record_methods",
    table: "record_methods",
    pk: "record_method_id",
    columns: ["record_method_id", "method_id", "record_method_pay"],
    nullable: [],
    scope: { kind: "record", column: "record_id" },
  },
  {
    key: "record_extras",
    table: "record_extras",
    pk: "record_extra_id",
    columns: [
      "record_extra_id",
      "record_extra_name",
      "record_extra_value",
      "record_extra_eff",
      "record_extra_kind",
      "record_extra_flag",
    ],
    nullable: [],
    scope: { kind: "record", column: "record_id" },
  },
  {
    key: "record_images",
    table: "record_images",
    pk: "record_image_id",
    columns: ["record_image_id", "record_image_order", "record_image_name", "record_image_mime"],
    nullable: [],
    scope: { kind: "record", column: "record_id" },
  },
  {
    key: "discounts",
    table: "discounts",
    pk: "discount_id",
    columns: [
      "discount_id",
      "discount_group_id",
      "record_listing_id",
      "discount_kind",
      "discount_value",
      "discount_eff",
    ],
    nullable: [],
    // No record_id column: reads and the aggregate's DELETE reach these rows
    // through `record_listings`.
    scope: { kind: "listing", via: "record_listings", column: "record_listing_id" },
  },
];

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
  product: {
    entity: "product",
    table: "products",
    pk: "product_id",
    columns: [
      "product_id",
      "product_name",
      "product_note",
      "product_flag",
      "product_updated_at",
      "product_deleted_at",
    ],
    nullable: ["product_deleted_at"],
    updatedAt: "product_updated_at",
    deletedAt: "product_deleted_at",
    syncAt: "product_sync_at",
  },
  product_name: {
    entity: "product_name",
    table: "product_names",
    pk: "product_name_id",
    columns: [
      "product_name_id",
      "product_id",
      "product_name_value",
      "product_name_updated_at",
      "product_name_deleted_at",
    ],
    nullable: ["product_name_deleted_at"],
    updatedAt: "product_name_updated_at",
    deletedAt: "product_name_deleted_at",
    syncAt: "product_name_sync_at",
  },
  property: {
    entity: "property",
    table: "properties",
    pk: "property_id",
    columns: [
      "property_id",
      "product_id",
      "property_key",
      "property_value",
      "property_updated_at",
      "property_deleted_at",
    ],
    nullable: ["property_deleted_at"],
    updatedAt: "property_updated_at",
    deletedAt: "property_deleted_at",
    syncAt: "property_sync_at",
  },
  listing: {
    entity: "listing",
    table: "listings",
    pk: "listing_id",
    columns: [
      "listing_id",
      "product_id",
      "listing_name",
      "listing_price",
      "listing_unit",
      "listing_kind",
      "listing_code",
      "listing_updated_at",
      "listing_deleted_at",
    ],
    nullable: ["listing_code", "listing_deleted_at"],
    updatedAt: "listing_updated_at",
    deletedAt: "listing_deleted_at",
    syncAt: "listing_sync_at",
  },
  image: {
    entity: "image",
    table: "images",
    pk: "image_id",
    columns: [
      "image_id",
      "image_order",
      "image_name",
      "image_mime",
      "product_id",
      "image_updated_at",
      "image_deleted_at",
    ],
    nullable: ["image_deleted_at"],
    updatedAt: "image_updated_at",
    deletedAt: "image_deleted_at",
    syncAt: "image_sync_at",
  },
  customer: {
    entity: "customer",
    table: "customers",
    pk: "customer_id",
    columns: [
      "customer_id",
      "customer_name",
      "customer_phone",
      "customer_updated_at",
      "customer_deleted_at",
    ],
    nullable: ["customer_deleted_at"],
    updatedAt: "customer_updated_at",
    deletedAt: "customer_deleted_at",
    syncAt: "customer_sync_at",
  },
  supplier: {
    entity: "supplier",
    table: "suppliers",
    pk: "supplier_id",
    columns: [
      "supplier_id",
      "supplier_name",
      "supplier_note",
      "supplier_updated_at",
      "supplier_deleted_at",
    ],
    nullable: ["supplier_deleted_at"],
    updatedAt: "supplier_updated_at",
    deletedAt: "supplier_deleted_at",
    syncAt: "supplier_sync_at",
  },
  extra: {
    entity: "extra",
    table: "extras",
    pk: "extra_id",
    columns: [
      "extra_id",
      "extra_name",
      "extra_value",
      "extra_kind",
      "extra_flag",
      "extra_updated_at",
      "extra_deleted_at",
    ],
    nullable: ["extra_deleted_at"],
    updatedAt: "extra_updated_at",
    deletedAt: "extra_deleted_at",
    syncAt: "extra_sync_at",
  },
  method: {
    entity: "method",
    table: "methods",
    pk: "method_id",
    columns: ["method_id", "method_name", "method_kind", "method_updated_at", "method_deleted_at"],
    nullable: ["method_name", "method_deleted_at"],
    updatedAt: "method_updated_at",
    deletedAt: "method_deleted_at",
    syncAt: "method_sync_at",
  },
  social: {
    entity: "social",
    table: "socials",
    pk: "social_id",
    columns: ["social_id", "social_name", "social_value", "social_updated_at", "social_deleted_at"],
    nullable: ["social_deleted_at"],
    updatedAt: "social_updated_at",
    deletedAt: "social_deleted_at",
    syncAt: "social_sync_at",
  },
  // Append-only journal (§6.3): never updated, never deleted. It has a creation
  // clock instead of a merge clock, and no tombstone.
  product_event: {
    entity: "product_event",
    table: "product_events",
    pk: "product_event_id",
    columns: [
      "product_event_id",
      "product_event_created_at",
      "product_event_value",
      "product_event_capital",
      "product_event_note",
      "product_id",
      "stock_id",
      "record_id",
    ],
    nullable: ["stock_id", "record_id"],
    updatedAt: "product_event_created_at",
    deletedAt: null,
    syncAt: "product_event_sync_at",
  },
  // The aggregate header (§3.14). Its five child arrays travel in `ch`.
  record: {
    entity: "record",
    table: "records",
    pk: "record_id",
    columns: [
      "record_id",
      "record_created_at",
      "record_paid_at",
      "record_rounding",
      "record_credit_at",
      "record_cashier",
      "record_mode",
      "record_pay",
      "record_note",
      "record_fix",
      "record_customer_name",
      "record_customer_phone",
      "record_sub_total",
      "record_total",
      "record_updated_at",
      "record_deleted_at",
      "record_supplier_id",
      "record_supplier_name",
      "record_flag",
      "record_pair_id",
    ],
    nullable: [
      "record_paid_at",
      "record_credit_at",
      "record_deleted_at",
      "record_supplier_id",
      "record_pair_id",
    ],
    updatedAt: "record_updated_at",
    deletedAt: "record_deleted_at",
    syncAt: "record_sync_at",
  },
};

/** Every table the sync set touches, header tables first. */
export const SYNC_TABLES = ENTITY_ORDER.map((entity) => TABLES[entity]);

/**
 * A wire value. Canonical JSON only ever carries these three shapes: strings,
 * finite numbers, and explicit `null` (§4.2).
 */
export type WireValue = string | number | null;

/** A canonical row, keyed in `columns` order. */
export type WireRow = Record<string, WireValue>;

export function isEntity(value: unknown): value is Entity {
  return typeof value === "string" && (ENTITY_ORDER as readonly string[]).includes(value);
}

/**
 * Builds a canonical row object from an arbitrary record, in the table's column
 * order, with explicit `null` for anything missing.
 *
 * Missing is treated as `null` only for nullable columns: a NOT NULL column that
 * did not come back from SQLite is a bug in the caller's SELECT, and emitting
 * `null` for it would fail on the server instead of here.
 */
export function toCanonicalRow(def: EntityDef, source: Record<string, unknown>): WireRow {
  const row: WireRow = {};
  for (const column of def.columns) {
    const value = source[column];
    row[column] = normalize(value, def.nullable.includes(column));
  }
  return row;
}

export function toCanonicalChild(def: ChildDef, source: Record<string, unknown>): WireRow {
  const row: WireRow = {};
  for (const column of def.columns) {
    const value = source[column];
    row[column] = normalize(value, def.nullable.includes(column));
  }
  return row;
}

/**
 * Coerces a driver value to a wire value.
 *
 * plugin-sql hands back plain JSON values, so this mostly guards against the two
 * things that would break the byte-stream contract: `undefined` (silently
 * dropped by `JSON.stringify`) and a non-finite number (serialised as `null`,
 * which would silently corrupt a row).
 */
function normalize(value: unknown, nullable: boolean): WireValue {
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

/** `SELECT` list for a table, in canonical order. */
export function selectColumns(def: EntityDef): string {
  return def.columns.join(", ");
}

/**
 * The canonical columns of one entity, by name.
 *
 * Both the encoder and the merge statements resolve through `TABLES`, so this
 * exists for callers (and tests) that only know the entity name.
 */
export function getColumnsFor(entity: Entity): readonly string[] {
  return TABLES[entity].columns;
}
