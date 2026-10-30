/**
 * The shapes one cart screen draws — a sale in Pos and a purchase in Restock
 * share them, so the two screens cannot drift on what a line or an extra is.
 *
 * The cart itself lives in `services/transaction` (`tx_listings` and
 * `tx_extras`); these are the UI shapes the grids, the discount stack and the
 * extra search hand around.
 */
import type { ValueKind } from "~/lib/constants";
import type { Mime } from "~/services/listing";

export type DiscountKind = "number" | "percent" | "pcs";

/** One discount on a line. `eff` is what it takes off; `total` is the running subtotal. */
export type DiscountLine = {
  id: string;
  value: number;
  kind: DiscountKind;
  eff: number;
  total: number;
};

/**
 * One cart line: goods, what they cost this time, how many.
 *
 * `price` is `Harga jual` on a sale and `Harga beli` on a purchase — the same
 * field, read against whichever mode the screen is in.
 */
export type Line = {
  id: string;
  name: string;
  code: string;
  /** How many pieces make one unit of the line. */
  unit: number;
  price: number;
  qty: number;
  /** The catalog listing this line came from, if any; a manual line has none. */
  listingId?: string | null;
  /** The line's discount stack; the list always ends in one empty line. */
  discounts: DiscountLine[];
  /**
   * The catalog photo of the listing this line came from, if it had one — the
   * card shows it beside the goods. UI-only, like `base`: there is no column
   * behind it, so a reloaded cart reads it back from the catalogue.
   */
  cover?: { name: string; mime: Mime } | null;
  /**
   * The catalogue product behind `listingId`, which is what the number cell's
   * detail sheet reads. UI-only, restored with `cover`.
   */
  productId?: string | null;
  /**
   * The catalog values the line started from, for the dirty marker and its undo.
   * Absent on a hand-entered (`+manual`) line, which has nothing to undo to.
   */
  base?: {
    name: string;
    code: string;
    unit: number;
    price: number;
  };
};

/** A charge or deduction applied to the whole record, e.g. biaya kartu, ongkos kirim. */
export type Extra = {
  id: string;
  name: string;
  kind: ValueKind;
  value: number;
  /**
   * The catalogue extra's flags (`extras.extra_flag`). `DUAL_FLAG` marks one
   * that also books an extras-only `outcoming` record for the same money when
   * the sale is committed. A preset carries the flag in; the row's `dual`
   * checkbox is where the cashier turns it on or off.
   */
  flag: number;
};

/** A charge the shop reaches for often; the extras search picks from these. */
export type ExtraPreset = {
  id: string;
  name: string;
  kind: ValueKind;
  /** The value a fresh extra starts at; usually left at zero to be filled in. */
  value: number;
  /** The flags the picked extra inherits — `DUAL_FLAG` travels with the name. */
  flag: number;
};
