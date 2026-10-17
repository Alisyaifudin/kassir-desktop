/**
 * Placeholder data for the Restock layout.
 *
 * Nothing here reads a service. It exists so the screen can be laid out and
 * reviewed before the draft, product, method and supplier services are wired
 * in, and it doubles as the shape those services will have to supply. Delete
 * this file when they are — the types it declares belong there.
 */
import type { MethodKind, ValueKind } from "~/lib/constants";

/** One line of a purchase: goods, what they cost this time, how many. */
export type Line = {
  id: string;
  name: string;
  barcode: string;
  /** Harga beli — the cost on this purchase, not the catalog selling price. */
  price: number;
  qty: number;
  /** The summed effect of the line's discounts, as a rupiah amount. */
  discount: number;
  /** `price * qty - discount`. */
  subtotal: number;
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

export type Draft = {
  id: string;
  /** Shown in the tab strip next to the draft's number. */
  title: string;
  number: number;
  lines: Line[];
  extras: Extra[];
  supplier: Supplier | null;
  note: string;
};

export type Supplier = {
  id: string;
  name: string;
  note: string;
};

export type SearchResult = {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stock: number;
};

export const CASHIER = "Ali";
export const PRECISION = 0;

/** The draft the screen is showing. */
export const DRAFT: Draft = {
  id: "01H",
  title: "Pasar Induk",
  number: 1,
  supplier: { id: "s1", name: "Pasar Induk", note: "Blok C no. 12 — Ibu Sari" },
  note: "Belanja mingguan, titip nota ke Bu Sari",
  lines: [
    {
      id: "L1",
      name: "Beras Pandan Wangi 5kg",
      barcode: "8991234567890",
      price: 68000,
      qty: 10,
      discount: 0,
      subtotal: 680000,
    },
    {
      id: "L2",
      name: "Minyak Goreng 2L",
      barcode: "8991234567891",
      price: 32000,
      qty: 12,
      discount: 10000,
      subtotal: 374000,
    },
    {
      id: "L3",
      name: "Gula Pasir 1kg",
      barcode: "",
      price: 15000,
      qty: 20,
      discount: 0,
      subtotal: 300000,
    },
  ],
  extras: [
    { id: "E1", name: "Ongkos Kirim", kind: "number", value: 50000, eff: 50000 },
    { id: "E2", name: "Diskon Grosir", kind: "percent", value: -3, eff: -40920 },
  ],
};

/** Its siblings, so the tab strip has more than one thing to show. */
export const DRAFTS: Draft[] = [
  DRAFT,
  { id: "01I", title: "Agen Sembako", number: 2, lines: [], extras: [], supplier: null, note: "" },
  { id: "01J", title: "Toko Bangunan", number: 3, lines: [], extras: [], supplier: null, note: "" },
];

/**
 * What the draft adds up to. `lines` less `extras`, then the rounding the
 * cashier sets in the payment form.
 */
export const TOTALS = {
  subtotal: 1364000,
  extras: 9080,
  rounding: 0,
  total: 1373080,
};

export const PAYMENT = {
  kind: "cash" satisfies MethodKind,
  /** The chosen method within the kind, e.g. a named transfer account. */
  methodId: "1000",
  rounding: "",
  paid: "1400000",
  change: 26920,
};

export const METHODS: { kind: MethodKind; name: string }[] = [
  { kind: "cash", name: "Tunai" },
  { kind: "qris", name: "QRIS" },
  { kind: "transfer", name: "Transfer" },
  { kind: "debit", name: "Debit" },
];

export const SEARCH_RESULTS: SearchResult[] = [
  { id: "p1", name: "Beras Pandan Wangi 5kg", barcode: "8991234567890", price: 72000, stock: 24 },
  { id: "p2", name: "Minyak Goreng 2L", barcode: "8991234567891", price: 35000, stock: 4 },
  { id: "p3", name: "Gula Pasir 1kg", barcode: "8991234567892", price: 16500, stock: 0 },
];

export const SUPPLIERS: Supplier[] = [
  { id: "s1", name: "Pasar Induk", note: "Blok C no. 12 — Ibu Sari" },
  { id: "s2", name: "Agen Sembako Berkah", note: "WhatsApp, kirim tiap Selasa" },
  { id: "s3", name: "Toko Bangunan Jaya", note: "" },
];
