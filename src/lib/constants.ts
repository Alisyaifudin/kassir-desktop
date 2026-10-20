import { Temporal } from "temporal-polyfill";

export const version = "5.19.38";

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

// extra_flag bitmask: 0b1 = dual
export const DUAL_FLAG = 0b1;

export const tz = Temporal.Now.timeZoneId();
