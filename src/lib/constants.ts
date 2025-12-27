import { Temporal } from "temporal-polyfill";

export const DEFAULT_METHOD = {
  id: 1000,
  method: "cash",
  name: null,
} as const;

export const DEBOUNCE_DELAY = 200;

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Juni",
  "Juli",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export const tz = Temporal.Now.timeZoneId();
