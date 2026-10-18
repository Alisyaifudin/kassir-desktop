/**
 * Placeholder data for the Restock listing stage.
 *
 * The draft's money settings and payments are real (see `services/transaction`);
 * only the listings, their extras, and the catalog search hits are still mocked,
 * until the product service is wired into the listing stage. Delete this file
 * when it is.
 */
import type { ValueKind } from "~/lib/constants";

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
  /** The summed effect of the line's discounts, as a rupiah amount. */
  discount: number;
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

export type SearchResult = {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stock: number;
};

export const LINES: Line[] = [
  {
    id: "L1",
    name: "Beras Pandan Wangi 5kg",
    code: "8991234567890",
    unit: 1,
    price: 68000,
    qty: 10,
    discount: 0,
    base: { name: "Beras Pandan Wangi 5kg", code: "8991234567890", unit: 1, price: 68000 },
  },
  {
    id: "L2",
    name: "Minyak Goreng 2L",
    code: "8991234567891",
    unit: 1,
    price: 32000,
    qty: 12,
    discount: 10000,
    base: { name: "Minyak Goreng 2L", code: "8991234567891", unit: 1, price: 32000 },
  },
  {
    id: "L3",
    name: "Gula Pasir 1kg",
    code: "",
    unit: 1,
    price: 15000,
    qty: 20,
    discount: 0,
    base: { name: "Gula Pasir 1kg", code: "", unit: 1, price: 15000 },
  },
];

export const EXTRAS: Extra[] = [
  { id: "E1", name: "Ongkos Kirim", kind: "number", value: 50000, eff: 50000 },
  { id: "E2", name: "Diskon Grosir", kind: "percent", value: -3, eff: -40920 },
];

export const SEARCH_RESULTS: SearchResult[] = [
  { id: "p1", name: "Beras Pandan Wangi 5kg", barcode: "8991234567890", price: 72000, stock: 24 },
  { id: "p2", name: "Minyak Goreng 2L", barcode: "8991234567891", price: 35000, stock: 4 },
  { id: "p3", name: "Gula Pasir 1kg", barcode: "8991234567892", price: 16500, stock: 0 },
];
