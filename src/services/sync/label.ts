/**
 * The name a sync log line calls a row by.
 *
 * The log says *what* moved (`Mengunduh produk Masker Kain`), and the noun for
 * each entity belongs to the screen — `label.ts` only answers "which column is
 * this row's own name". It lives service-side because that is where the rows are:
 * a pull frame and a push frame both hold the canonical row, so the name costs no
 * query in either direction.
 *
 * Two entities have no name column and get a stated figure instead: a money row
 * carries no title (its `money_note` is optional), and a record has no number, so
 * both fall back to the amount the operator recognises them by.
 */
import type { WireRow } from "./schema";

/** The column that names a row, per entity. */
const NAME_COLUMN: Record<string, string> = {
  pocket: "pocket_name",
  customer: "customer_name",
  supplier: "supplier_name",
  method: "method_name",
  social: "social_name",
  extra: "extra_name",
  product: "product_name",
  category: "category_name",
  product_name: "product_name_value",
  property: "property_key",
  listing: "listing_name",
  image: "image_name",
  record: "record_customer_name",
};

/** Indonesian rupiah, the same shape the app's own fields print. */
function rupiah(value: WireRow[string]): string | null {
  return typeof value === "number" ? `Rp ${value.toLocaleString("id-ID")}` : null;
}

/** A column value as a label, or `null` when it is empty/absent. */
function text(row: WireRow, column: string): string | null {
  const value = row[column];
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * The row's own name, or `null` when it has none this device can state.
 *
 * `null` is not a failure: a tombstone arrives as an id, an unnamed money row has
 * nothing to print, and both read fine without one (`Menghapus produk`,
 * `Mengunduh catatan kas`).
 */
export function labelOf(entity: string, row: WireRow): string | null {
  // The two entities whose identity is a figure rather than a title. The note
  // wins when there is one — a cashier named the row, and that beats the amount.
  if (entity === "money") {
    return text(row, "money_note") ?? rupiah(row["money_value"]);
  }
  if (entity === "record") {
    return text(row, "record_customer_name") ?? rupiah(row["record_total"]);
  }
  // The journal has no name either: its magnitude and direction are the row. The
  // screen prefixes the noun (`stok`), so the label only says which way and how
  // much — and the sign is what decides which way.
  if (entity === "product_event") {
    const value = row["product_event_value"];
    if (typeof value !== "number") return null;
    return value < 0 ? `keluar ${Math.abs(value)}` : `masuk ${value}`;
  }

  const column = NAME_COLUMN[entity];
  if (column === undefined) return null;
  return text(row, column) ?? (entity === "method" ? text(row, "method_kind") : null);
}
