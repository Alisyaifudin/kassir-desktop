import { Temporal } from "temporal-polyfill";

export const version = "5.0.0";

export const METHODS = ["cash", "transfer", "debit", "qris"] as const;
export const METHOD_NAMES = {
  cash: "Tunai",
  transfer: "Transfer",
  debit: "Debit",
  qris: "QRIS",
} as const;

// (1000, 'cash'), (1001, 'transfer'), (1002, 'debit'), (1003, 'qris');
export const METHOD_BASE_ID = {
  cash: 1000,
  transfer: 1001,
  debit: 1002,
  qris: 1003,
} as const;
export const METHOD_BASE_KIND = {
  1000: "cash",
  1001: "transfer",
  1002: "debit",
  1003: "qris",
} as const;

export const DEFAULT_METHOD = {
  id: 1000,
  method: "cash",
  name: null,
} as const;

export const DEBOUNCE_DELAY = 200;

export const tz = Temporal.Now.timeZoneId();
