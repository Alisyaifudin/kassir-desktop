/**
 * Placeholder data for the Pos listing stage.
 *
 * The draft's money settings and payments are real (see `services/transaction`);
 * only the listings, their extras, and the catalog search hits are still mocked,
 * until the product service is wired into the listing stage. Delete this file
 * when it is.
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

export const LINES: Line[] = [
  {
    id: "L1",
    name: "Beras Pandan Wangi 5kg",
    code: "8991234567890",
    unit: 1,
    price: 75000,
    qty: 2,
    discounts: [{ id: "d-l1-0", value: 0, kind: "percent", eff: 0, total: 150000 }],
    base: { name: "Beras Pandan Wangi 5kg", code: "8991234567890", unit: 1, price: 75000 },
  },
  {
    id: "L2",
    name: "Minyak Goreng 2L",
    code: "8991234567891",
    unit: 1,
    price: 35000,
    qty: 1,
    discounts: [
      { id: "d-l2-0", value: 10000, kind: "number", eff: 10000, total: 25000 },
      { id: "d-l2-1", value: 0, kind: "percent", eff: 0, total: 25000 },
    ],
    base: { name: "Minyak Goreng 2L", code: "8991234567891", unit: 1, price: 35000 },
  },
  {
    id: "L3",
    name: "Gula Pasir 1kg",
    code: "",
    unit: 1,
    price: 18000,
    qty: 3,
    discounts: [{ id: "d-l3-0", value: 0, kind: "percent", eff: 0, total: 54000 }],
    base: { name: "Gula Pasir 1kg", code: "", unit: 1, price: 18000 },
  },
];

export const EXTRAS: Extra[] = [
  { id: "E1", name: "Biaya Kartu", kind: "percent", value: 2 },
];

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