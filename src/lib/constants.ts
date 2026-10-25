import { Temporal } from "temporal-polyfill";

export const version = "6.0.3";

export const METHODS = ["cash", "qris", "transfer", "debit"] as const;
export type METHOD_BASE = "cash" | "transfer" | "debit" | "qris";
export type MethodKind = (typeof METHODS)[number];

/**
 * The kinds a default method can be set for. `cash` is excluded: it is what the
 * others fall back to, so it is never itself a default.
 */
export const DEFAULTABLE_KINDS = ["transfer", "debit", "qris"] as const;
export type DefaultableKind = (typeof DEFAULTABLE_KINDS)[number];

/**
 * How an extra's `value` is read: a flat amount, or a percentage of the total.
 * Shared by the extra catalog and the records that snapshot it.
 */
export type ValueKind = "number" | "percent";

/**
 * The two directions a record can take, as the UI names them: `incoming` is a sale
 * (money in, stock consumed), `outcoming` a purchase (money out, stock received).
 *
 * It reads Masuk/Keluar everywhere — the mode switch, the search filter, the
 * receipt heading, the dashboard ledger, the analytics toggle and the change-mode
 * dialog — so the vocabulary cannot drift back to Jual/Beli one screen at a time.
 */
export const MODE_NAMES = { incoming: "Masuk", outcoming: "Keluar" } as const;

/** Shape of the built-in method rows seeded below; the `method` service owns the domain type. */
type Method = { id: string; name?: string; kind: MethodKind };

const ProductKind = {
  retail: "Ecer",
  wholesale: "Grosir",
  marketplace: "Online",
};

/** Display label for a listing `kind`. `kind` is free text (`retail`, `karton`, …),
 *  so unknown values fall back to themselves rather than hiding the input. */
export function getProductKind(v: string): string {
  return (ProductKind as Record<string, string>)[v] ?? v;
}

export const METHOD_NAMES = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
  debit: "Debit",
} as const;

export const METHOD_KBD = {
  cash: "Ctrl+0",
  qris: "Ctrl+1",
  transfer: "Ctrl+2",
  debit: "Ctrl+3",
} as const;

/** Ctrl+0..3 pick a method kind, in `METHODS` order. */
export const METHOD_BY_KEY: Record<string, MethodKind> = {
  "0": "cash",
  "1": "qris",
  "2": "transfer",
  "3": "debit",
};

// (1000, 'cash'), (1001, 'transfer'), (1002, 'debit'), (1003, 'qris');
export const METHOD_BASE_ID = {
  cash: "1000",
  qris: "1003",
  transfer: "1001",
  debit: "1002",
} as const;
export const METHOD_BASE_KIND = {
  "1000": "cash",
  "1003": "qris",
  "1001": "transfer",
  "1002": "debit",
} as const;

export const DEFAULT_METHOD = {
  id: "1000",
  method: "cash",
  name: null,
} as const;

export const DEFAULT_METHODS = [
  {
    id: "1000",
    kind: "cash",
  },
  {
    id: "1003",
    kind: "qris",
  },
  {
    id: "1001",
    kind: "transfer",
  },
  {
    id: "1002",
    kind: "debit",
  },
] satisfies Method[];
export const DEBOUNCE_DELAY = 100;

/**
 * How long a search bar waits before it runs its filter.
 *
 * Deliberately longer than `DEBOUNCE_DELAY`, which times the cart's writes. At
 * 100 ms a fast typist (~200 ms between keys, but often less) still fires one
 * filter per key, and every one of those passes paints a half-word's result for
 * a frame — the wrong answer in a split second — and, on a long list, re-filters
 * and re-renders it between keystrokes, which is what made the field itself feel
 * slow. 250 ms is past the gap between quick keys and still under the ~300 ms
 * where a search starts to feel unresponsive.
 */
export const SEARCH_DELAY = 250;

// extra_flag bitmask: 0b1 = dual
export const DUAL_FLAG = 0b1;

export const tz = Temporal.Now.timeZoneId();
