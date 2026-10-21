/**
 * UI shapes for the Restock cart and the extra-search hit.
 *
 * The cart itself lives in `services/transaction` (`tx_listings` and
 * `tx_extras`); the extra suggestions come from `services/extra`. This file
 * only keeps the shapes.
 */
import type { ValueKind } from "~/lib/constants";

export type DiscountKind = "number" | "percent" | "pcs";

/** One discount on a line. `eff` is what it takes off; `total` is the running subtotal. */
export type DiscountLine = {
  id: string;
  value: number;
  kind: DiscountKind;
  eff: number;
  total: number;
};

/** One line of a purchase: goods, what they cost this time, how many. */
export type Line = {
  id: string;
  name: string;
  code: string;
  /** How many pieces make one unit of the line. */
  unit: number;
  /** Harga beli — the cost on this purchase, not the catalog selling price. */
  price: number;
  qty: number;
  /** The catalog listing this line came from, if any; a manual line has none. */
  listingId?: string | null;
  /** The line's discount stack; the list always ends in one empty line. */
  discounts: DiscountLine[];
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

/** A charge or deduction applied to the whole purchase, e.g. ongkos kirim. */
export type Extra = {
  id: string;
  name: string;
  kind: ValueKind;
  value: number;
};

/** A charge the shop reaches for often; the extras search picks from these. */
export type ExtraPreset = {
  id: string;
  name: string;
  kind: ValueKind;
  /** The value a fresh extra starts at; usually left at zero to be filled in. */
  value: number;
};
