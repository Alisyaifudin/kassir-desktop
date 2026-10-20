/**
 * UI shapes for the Pos cart and the extra presets the search offers.
 *
 * The cart itself now lives in `services/transaction` (`tx_listings` and
 * `tx_extras`); this file only keeps the types and the preset catalogue.
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

/** One line of a sale: goods, what they cost this time, how many. */
export type Line = {
  id: string;
  name: string;
  code: string;
  /** How many pieces make one unit of the line. */
  unit: number;
  /** Harga jual — the price on this sale, not the catalog cost. */
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

/** A charge or deduction applied to the whole sale, e.g. biaya kartu. */
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

export const EXTRA_PRESETS: ExtraPreset[] = [
  { id: "P1", name: "Ongkos Kirim", kind: "number", value: 0 },
  { id: "P2", name: "Biaya Packing", kind: "number", value: 0 },
  { id: "P3", name: "Biaya Kartu", kind: "percent", value: 0 },
  { id: "P4", name: "Biaya Layanan", kind: "percent", value: 0 },
  { id: "P5", name: "Diskon Grosir", kind: "percent", value: 0 },
  { id: "P6", name: "Diskon Kuantitas", kind: "percent", value: 0 },
  { id: "P7", name: "Pembulatan", kind: "number", value: 0 },
  { id: "P8", name: "Biaya Antar", kind: "number", value: 0 },
];