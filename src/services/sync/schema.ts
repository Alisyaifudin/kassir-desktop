/**
 * The v2 wire dictionaries (`SYNC-V2.md` §8, §9.1, §16.3).
 *
 * Every group the desktop syncs is described here and nowhere else: the entity's
 * wire name, its table, its primary key, the canonical column order, which
 * columns may be `null`, its merge clock, its soft-delete column, its dirty flag
 * and its merge kind. The encoders, the merge and the SQL all walk these
 * dictionaries, so a column cannot drift between the two directions and the wire
 * order the server freezes is the order our SQL selects.
 *
 * `*_sync_at` is deliberately **not** a wire column: it is this device's own
 * bookkeeping (`NULL` = still owes the server a push) and never crosses the wire
 * (§3.2, §9.4).
 *
 * The record group is the one aggregate: one header row plus five child sets,
 * pushed and pulled as one frame (§5.5, §8.8). Its child rows carry no clock and
 * no dirty flag — the header owns the whole aggregate.
 */

/** One independently synced unit: one log, one bookmark, one endpoint pair. */
export type SyncGroup =
  | "money"
  | "customer"
  | "supplier"
  | "method"
  | "social"
  | "extra"
  | "product"
  | "record";

/** Every group this build syncs, in the order the cycle visits them. */
export const SYNC_GROUPS: readonly SyncGroup[] = [
  "money",
  "customer",
  "supplier",
  "method",
  "social",
  "extra",
  "product",
  "record",
];

/**
 * How one entity decides who wins (§4.3, §5).
 *
 * - `lww` — plain last-writer-wins on the entity's clock.
 * - `money` — the ledger rule: immutable financial fields, editable note and
 *   tombstone.
 * - `append` — insert if absent, `noop` if present; never update.
 * - `aggregate` — the record: header plus five child sets, replaced wholesale.
 */
export type MergeKind = "lww" | "money" | "append" | "aggregate";

/** One entity's contract: where it lives, how it is keyed, what travels. */
export type EntityDef = {
  /** Wire name (`"customer"`, `"product_event"`, …). */
  entity: string;
  group: SyncGroup;
  table: string;
  /** Primary-key column, and the object key the server frames use for it. */
  pk: string;
  /** Canonical column order (§8). Never shared between tables. */
  columns: readonly string[];
  /** Columns that may be `null`; every other column is NOT NULL. */
  nullable: readonly string[];
  /** The merge clock column, or `null` for append-only entities. */
  updatedAt: string | null;
  /** Soft-delete column, or `null` when the entity has no tombstone. */
  deletedAt: string | null;
  /** Push bookkeeping; never crosses the wire (§3.2). */
  syncAt: string;
  kind: MergeKind;
  /** `ORDER BY` for the push selector, so a batch is deterministic. */
  order: string;
};

/** One child set of the record aggregate (§8.8). */
export type ChildDef = {
  /** Key in the frame's `ch`, and the child table's name. */
  key: string;
  table: string;
  pk: string;
  columns: readonly string[];
  nullable: readonly string[];
  /**
   * How the child reaches its record: directly through `record_id`, or (for
   * `discounts`) through the `record_listing_id` it belongs to. The child rows
   * never carry `record_id` on the wire either way.
   */
  via: "record" | "listing";
};

/** One group's contract: its entities, its limits, its aggregate children. */
export type GroupDef = {
  group: SyncGroup;
  /** Push order: parents before children, catalog before the journal. */
  entities: readonly EntityDef[];
  /** Default and maximum entries per pull request (§1.4, §16.1). */
  pullLimit: number;
  pullMax: number;
  /** Push batch bounds (§4.1, §16.1): frames and uncompressed bytes. */
  pushFrames: number;
  pushBytes: number;
  /** The record group's five child sets; absent for every other group. */
  children?: readonly ChildDef[];
};

/** The record header's 20 columns, in the order §8.8 freezes. */
const RECORD_COLUMNS = [
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
] as const;

/** The record's five child sets, in the order §8.8 lists them. */
const RECORD_CHILDREN: readonly ChildDef[] = [
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
    via: "record",
  },
  {
    key: "record_methods",
    table: "record_methods",
    pk: "record_method_id",
    columns: ["record_method_id", "method_id", "record_method_pay"],
    nullable: [],
    via: "record",
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
    via: "record",
  },
  {
    key: "record_images",
    table: "record_images",
    pk: "record_image_id",
    columns: [
      "record_image_id",
      "record_image_order",
      "record_image_name",
      "record_image_mime",
    ],
    nullable: [],
    via: "record",
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
    // A discount hangs off a listing, and the listing hangs off the record.
    via: "listing",
  },
];

function row(
  group: SyncGroup,
  entity: string,
  table: string,
  pk: string,
  columns: readonly string[],
  nullable: readonly string[],
  updatedAt: string | null,
  deletedAt: string | null,
  syncAt: string,
  kind: MergeKind,
  order: string,
): EntityDef {
  return {
    entity,
    group,
    table,
    pk,
    columns,
    nullable,
    updatedAt,
    deletedAt,
    syncAt,
    kind,
    order,
  };
}

/** Every entity, keyed by wire name. */
export const TABLES: Record<string, EntityDef> = {
  pocket: row(
    "money",
    "pocket",
    "pockets",
    "pocket_id",
    [
      "pocket_id",
      "pocket_name",
      "pocket_type",
      "pocket_ordering",
      "pocket_updated_at",
      "pocket_deleted_at",
    ],
    ["pocket_deleted_at"],
    "pocket_updated_at",
    "pocket_deleted_at",
    "pocket_sync_at",
    "lww",
    "pocket_ordering, pocket_id",
  ),
  money: row(
    "money",
    "money",
    "money",
    "money_id",
    [
      "money_id",
      "timestamp",
      "money_value",
      "pocket_id",
      "money_note",
      "money_updated_at",
      "money_deleted_at",
    ],
    ["money_deleted_at"],
    "money_updated_at",
    "money_deleted_at",
    "money_sync_at",
    "money",
    "timestamp, money_id",
  ),
  customer: row(
    "customer",
    "customer",
    "customers",
    "customer_id",
    [
      "customer_id",
      "customer_name",
      "customer_phone",
      "customer_updated_at",
      "customer_deleted_at",
    ],
    ["customer_deleted_at"],
    "customer_updated_at",
    "customer_deleted_at",
    "customer_sync_at",
    "lww",
    "customer_name COLLATE NOCASE, customer_id",
  ),
  supplier: row(
    "supplier",
    "supplier",
    "suppliers",
    "supplier_id",
    [
      "supplier_id",
      "supplier_name",
      "supplier_note",
      "supplier_updated_at",
      "supplier_deleted_at",
    ],
    ["supplier_deleted_at"],
    "supplier_updated_at",
    "supplier_deleted_at",
    "supplier_sync_at",
    "lww",
    "supplier_name COLLATE NOCASE, supplier_id",
  ),
  method: row(
    "method",
    "method",
    "methods",
    "method_id",
    ["method_id", "method_name", "method_kind", "method_updated_at", "method_deleted_at"],
    ["method_name", "method_deleted_at"],
    "method_updated_at",
    "method_deleted_at",
    "method_sync_at",
    "lww",
    "method_kind, method_name COLLATE NOCASE, method_id",
  ),
  social: row(
    "social",
    "social",
    "socials",
    "social_id",
    ["social_id", "social_name", "social_value", "social_updated_at", "social_deleted_at"],
    ["social_deleted_at"],
    "social_updated_at",
    "social_deleted_at",
    "social_sync_at",
    "lww",
    "social_name COLLATE NOCASE, social_id",
  ),
  extra: row(
    "extra",
    "extra",
    "extras",
    "extra_id",
    [
      "extra_id",
      "extra_name",
      "extra_value",
      "extra_kind",
      "extra_flag",
      "extra_updated_at",
      "extra_deleted_at",
    ],
    ["extra_deleted_at"],
    "extra_updated_at",
    "extra_deleted_at",
    "extra_sync_at",
    "lww",
    "extra_name COLLATE NOCASE, extra_id",
  ),
  product: row(
    "product",
    "product",
    "products",
    "product_id",
    [
      "product_id",
      "product_name",
      "product_note",
      "product_flag",
      "product_updated_at",
      "product_deleted_at",
    ],
    ["product_deleted_at"],
    "product_updated_at",
    "product_deleted_at",
    "product_sync_at",
    "lww",
    "product_name COLLATE NOCASE, product_id",
  ),
  product_name: row(
    "product",
    "product_name",
    "product_names",
    "product_name_id",
    [
      "product_name_id",
      "product_id",
      "product_name_value",
      "product_name_updated_at",
      "product_name_deleted_at",
    ],
    ["product_name_deleted_at"],
    "product_name_updated_at",
    "product_name_deleted_at",
    "product_name_sync_at",
    "lww",
    "product_id, product_name_value COLLATE NOCASE, product_name_id",
  ),
  property: row(
    "product",
    "property",
    "properties",
    "property_id",
    [
      "property_id",
      "product_id",
      "property_key",
      "property_value",
      "property_updated_at",
      "property_deleted_at",
    ],
    ["property_deleted_at"],
    "property_updated_at",
    "property_deleted_at",
    "property_sync_at",
    "lww",
    "product_id, property_key, property_id",
  ),
  listing: row(
    "product",
    "listing",
    "listings",
    "listing_id",
    [
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
    ["listing_code", "listing_deleted_at"],
    "listing_updated_at",
    "listing_deleted_at",
    "listing_sync_at",
    "lww",
    "product_id, listing_name COLLATE NOCASE, listing_id",
  ),
  image: row(
    "product",
    "image",
    "images",
    "image_id",
    [
      "image_id",
      "image_order",
      "image_name",
      "image_mime",
      "product_id",
      "image_updated_at",
      "image_deleted_at",
    ],
    ["image_deleted_at"],
    "image_updated_at",
    "image_deleted_at",
    "image_sync_at",
    "lww",
    "product_id, image_order, image_id",
  ),
  product_event: row(
    "product",
    "product_event",
    "product_events",
    "product_event_id",
    [
      "product_event_id",
      "product_event_created_at",
      "product_event_value",
      "product_event_capital",
      "product_event_note",
      "product_id",
      "stock_id",
      "record_id",
    ],
    ["stock_id", "record_id"],
    // Append-only: `product_event_created_at` is the event time, not a clock.
    null,
    null,
    "product_event_sync_at",
    "append",
    "product_event_created_at, product_event_id",
  ),
  record: row(
    "record",
    "record",
    "records",
    "record_id",
    RECORD_COLUMNS,
    [
      "record_paid_at",
      "record_credit_at",
      "record_deleted_at",
      "record_supplier_id",
      "record_pair_id",
    ],
    "record_updated_at",
    "record_deleted_at",
    "record_sync_at",
    "aggregate",
    "record_updated_at, record_id",
  ),
};

function group(
  name: SyncGroup,
  entities: readonly string[],
  limits: { pullLimit: number; pullMax: number; pushFrames: number; pushBytes: number },
  children?: readonly ChildDef[],
): GroupDef {
  return {
    group: name,
    entities: entities.map((entity) => {
      const def = TABLES[entity];
      if (def === undefined) throw new Error(`entitas sinkronisasi tidak dikenal: ${entity}`);
      return def;
    }),
    ...limits,
    ...(children === undefined ? {} : { children }),
  };
}

/** The simple groups' limits: 5000/20000 pull, 1000 frames / 1 MB push. */
const SIMPLE_LIMITS = {
  pullLimit: 5000,
  pullMax: 20_000,
  pushFrames: 1000,
  pushBytes: 1_000_000,
} as const;

/** Every group, keyed by name. */
export const GROUPS: Record<SyncGroup, GroupDef> = {
  money: group("money", ["pocket", "money"], SIMPLE_LIMITS),
  customer: group("customer", ["customer"], SIMPLE_LIMITS),
  supplier: group("supplier", ["supplier"], SIMPLE_LIMITS),
  method: group("method", ["method"], SIMPLE_LIMITS),
  social: group("social", ["social"], SIMPLE_LIMITS),
  extra: group("extra", ["extra"], SIMPLE_LIMITS),
  product: group(
    "product",
    ["product", "product_name", "property", "listing", "image", "product_event"],
    SIMPLE_LIMITS,
  ),
  record: group(
    "record",
    ["record"],
    {
      pullLimit: 1000,
      pullMax: 5000,
      pushFrames: 1000,
      // §16.1: 8 MB uncompressed. The budget is on the body, so leave a little
      // room for the line terminator of a record that is exactly at the bound.
      pushBytes: 8 * 1024 * 1024,
    },
    RECORD_CHILDREN,
  ),
};

/** True when `group` is one of the eight. */
export function isGroup(value: unknown): value is SyncGroup {
  return typeof value === "string" && (SYNC_GROUPS as readonly string[]).includes(value);
}

/** Every entity name, as a set — for tolerant frame parsing (§2.9). */
const ENTITY_NAMES = new Set(Object.keys(TABLES));

/** True when `value` names an entity this build knows. */
export function isEntity(value: unknown): value is string {
  return typeof value === "string" && ENTITY_NAMES.has(value);
}

/** The group an entity belongs to, or `null` when it is not ours. */
export function groupOf(entity: string): SyncGroup | null {
  return TABLES[entity]?.group ?? null;
}

/** The child def for a `ch` key, or `undefined` when it is not a record child. */
export function childOf(key: string): ChildDef | undefined {
  return RECORD_CHILDREN.find((child) => child.key === key);
}

/** Every record child table, in dependency order (parents before dependants). */
export const RECORD_CHILD_TABLES: readonly ChildDef[] = RECORD_CHILDREN;

/**
 * A wire value. The protocol carries strings, finite numbers and explicit
 * `null` — nothing else (§2.2).
 */
export type WireValue = string | number | null;

/** A canonical row, keyed in `columns` order. */
export type WireRow = Record<string, WireValue>;

/** The five child arrays of a record aggregate, keyed by table name. */
export type WireChildren = Record<string, WireRow[]>;

/** Coerces one driver/JSON value to a wire value. */
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
  const out: WireRow = {};
  for (const column of def.columns) {
    out[column] = normalize(source[column], def.nullable.includes(column));
  }
  return out;
}

/** The same, for one child set of the record aggregate. */
export function toCanonicalChild(child: ChildDef, source: Record<string, unknown>): WireRow {
  const out: WireRow = {};
  for (const column of child.columns) {
    out[column] = normalize(source[column], child.nullable.includes(column));
  }
  return out;
}

/** An empty `ch` map with every key present — a record frame always sends all five. */
export function emptyChildren(): WireChildren {
  const out: WireChildren = {};
  for (const child of RECORD_CHILDREN) out[child.key] = [];
  return out;
}

/** `SELECT` list for a table, in canonical order. */
export function selectColumns(def: EntityDef): string {
  return def.columns.join(", ");
}

/** The primary-key value of a row, as a string. */
export function idOf(def: EntityDef, row: WireRow): string {
  return String(row[def.pk]);
}

/** The merge clock of a row, as a number; `0` for append-only entities. */
export function clockOf(def: EntityDef, row: WireRow): number {
  if (def.updatedAt === null) return 0;
  return Number(row[def.updatedAt]);
}
