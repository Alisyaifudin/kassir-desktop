/**
 * The value checks a record line has to pass before it may move stock.
 *
 * Both ways into a record go through this: a live cart (`add.draft`) and the
 * Settings → Data JSON import (`add.external`). The import used to validate the
 * *shape* of the file only, so a hand-edited backup with `qty: -3` wrote a record
 * whose total was negative while moving no stock — `consumeStatements` starts at
 * `remaining = qty` and loops `while remaining > 0` — and the same line on a
 * purchase created a negative lot in `stocks`/`product_events`. Stock is
 * event-sourced, so a wrong event is permanent history; nothing reported it.
 *
 * Kept pure and free of Effect so the boundary (the Zod schema in
 * `pages/Setting/Data/RecordUpload`) and the service can agree by construction.
 */
import Decimal from "decimal.js";
export type RecordLine = {
  name: string;
  qty: number;
  price: number;
  /** Omitted by a live cart, which derives it from the purchase total. */
  capital?: number;
  listingId: string | null;
  /** Pcs per listing unit. Omitted by an import, which reads it from the link. */
  unit?: number;
  /** The line's discount stack, as the cart derived it. Omitted when there is none. */
  discounts?: readonly { eff: number }[];
};

/** What a line is called in a message; a manual line may not have a name yet. */
function label(name: string): string {
  return name.trim() === "" ? "barang" : name;
}

/** `null` when the line is sound, otherwise the cashier-facing reason. */
export function validateRecordLine(line: RecordLine): string | null {
  if (!Number.isFinite(line.qty) || line.qty <= 0) {
    // Worded as the cart has always worded it: the grids and the e2e specs
    // match on this string.
    return "Jumlah barang tidak valid";
  }
  if (line.unit !== undefined && (!Number.isInteger(line.unit) || line.unit < 1)) {
    return `Satuan ${label(line.name)} tidak valid`;
  }
  if (!Number.isFinite(line.price) || line.price < 0) {
    return `Harga ${label(line.name)} tidak valid`;
  }
  if (line.capital !== undefined && (!Number.isFinite(line.capital) || line.capital < 0)) {
    return `Modal ${label(line.name)} tidak valid`;
  }
  if (line.listingId === null && line.name.trim() === "") {
    return "Nama barang manual harus diisi";
  }
  // The cart clamps a discount to its line, so an over-discount can no longer
  // be negative — but a line whose stack takes all of it is still not a sale,
  // and this is the one place both writers (cart and import) agree on that.
  const discounts = line.discounts ?? [];
  if (discounts.length > 0 && line.price > 0 && line.qty > 0) {
    const taken = discounts.reduce((total, discount) => total.plus(discount.eff), new Decimal(0));
    if (taken.gte(new Decimal(line.price).times(line.qty))) {
      return `Diskon ${label(line.name)} melebihi harga barang`;
    }
  }
  return null;
}

/**
 * The value checks a replayed portion has to pass.
 *
 * A portion is one lot's share of a line, and its `event` is the journal row it
 * caused. When a file carries them, the writer appends that row directly instead
 * of replaying FIFO — so the numbers are the movement itself, and a wrong sign
 * would append an entry to permanent history that the record's own mode
 * contradicts (a sale that adds stock, a purchase that takes it).
 *
 * Kept here, like `validateRecordLine`, so the import boundary and the service
 * agree by construction.
 */
export function validateRecordPortion(
  portion: {
    unit: number;
    qty: number;
    capital: number;
    event: {
      value: number;
      capital: number;
      productId: string;
      stockId: string | null;
    } | null;
  },
  mode: "incoming" | "outcoming",
): string | null {
  if (!Number.isInteger(portion.unit) || portion.unit < 1) return "Satuan tidak valid";
  if (!Number.isFinite(portion.qty) || portion.qty <= 0) return "Jumlah barang tidak valid";
  if (!Number.isFinite(portion.capital) || portion.capital < 0) return "Modal tidak valid";

  const event = portion.event;
  if (event === null) return null;

  // `product_events` holds pcs deltas as integers; a fractional one would not
  // survive the round trip through the column.
  if (!Number.isInteger(event.value)) return "Pergerakan stok tidak valid";
  if (!Number.isFinite(event.capital) || event.capital < 0) return "Modal tidak valid";
  if (event.productId.trim() === "") return "Barang tidak valid";
  if (mode === "incoming" && event.value > 0) return "Arah pergerakan stok tidak sesuai";
  if (mode === "outcoming" && event.value < 0) return "Arah pergerakan stok tidak sesuai";
  return null;
}
