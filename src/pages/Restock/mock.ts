/**
 * Placeholder data for the Restock listing stage.
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
  /** The rupiah amount it works out to. */
  eff: number;
};

export const LINES: Line[] = [
  {
    id: "L1",
    name: "Beras Pandan Wangi 5kg",
    code: "8991234567890",
    unit: 1,
    price: 68000,
    qty: 10,
    discounts: [{ id: "d-l1-0", value: 0, kind: "percent", eff: 0, total: 680000 }],
    base: { name: "Beras Pandan Wangi 5kg", code: "8991234567890", unit: 1, price: 68000 },
  },
  {
    id: "L2",
    name: "Minyak Goreng 2L",
    code: "8991234567891",
    unit: 1,
    price: 32000,
    qty: 12,
    discounts: [
      { id: "d-l2-0", value: 10000, kind: "number", eff: 10000, total: 374000 },
      { id: "d-l2-1", value: 0, kind: "percent", eff: 0, total: 374000 },
    ],
    base: { name: "Minyak Goreng 2L", code: "8991234567891", unit: 1, price: 32000 },
  },
  {
    id: "L3",
    name: "Gula Pasir 1kg",
    code: "",
    unit: 1,
    price: 15000,
    qty: 20,
    discounts: [{ id: "d-l3-0", value: 0, kind: "percent", eff: 0, total: 300000 }],
    base: { name: "Gula Pasir 1kg", code: "", unit: 1, price: 15000 },
  },
];

export const EXTRAS: Extra[] = [
  { id: "E1", name: "Ongkos Kirim", kind: "number", value: 50000, eff: 50000 },
  { id: "E2", name: "Diskon Grosir", kind: "percent", value: -3, eff: -40920 },
];
