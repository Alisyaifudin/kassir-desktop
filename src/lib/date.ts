import { Temporal } from "temporal-polyfill";
import { tz } from "./constants";

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

export const monthNames = {
  1: "Januari",
  2: "Februari",
  3: "Maret",
  4: "April",
  5: "Mei",
  6: "Juni",
  7: "Juli",
  8: "Agustus",
  9: "September",
  10: "Oktober",
  11: "November",
  12: "Desember",
} as Record<number, string>;

const dayNames = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
} as Record<number, string>;

export function getDayName(epochMilli: number) {
  const date = Temporal.Instant.fromEpochMilliseconds(epochMilli).toZonedDateTimeISO(tz);
  return dayNames[date.dayOfWeek];
}

export function formatDate(epochMilli: number, type: "short" | "long" = "short"): string {
  const date = Temporal.Instant.fromEpochMilliseconds(epochMilli).toZonedDateTimeISO(tz);
  const { day, month, year } = date;
  switch (type) {
    case "short":
      return `${day.toString().padStart(2, "0")}-${month.toString().padStart(2, "0")}-${year}`;
    case "long":
      return `${day} ${monthNames[month]} ${year}`;
  }
}

export function formatTime(epochMilli: number, format: "long" | "short" = "short"): string {
  const date = Temporal.Instant.fromEpochMilliseconds(epochMilli).toZonedDateTimeISO(tz);
  const { hour, minute, second } = date;
  switch (format) {
    case "long":
      return `${hour}:${minute.toString().padStart(2, "0")}:${second.toString().padStart(2, "0")}`;
    case "short":
      return `${hour}:${minute.toString().padStart(2, "0")}`;
  }
}

/**
 * The wall-clock reading of an epoch in the machine's zone, as the value the
 * `DateTime` picker edits. The picker never sees a zone: it edits the clock face
 * the operator is looking at, and `epochFromPlain` puts it back.
 */
export function plainFromEpoch(epochMilli: number): Temporal.PlainDateTime {
  return Temporal.Instant.fromEpochMilliseconds(epochMilli).toZonedDateTimeISO(tz).toPlainDateTime();
}

/**
 * The inverse: a wall-clock reading becomes an epoch in the machine's zone.
 * A reading that does not exist locally (the hour a DST jump skips) is
 * disambiguated forward, which is what Temporal's default `compatible` rule
 * does — the alternative is refusing a time the operator can see on a clock.
 */
export function epochFromPlain(plain: Temporal.PlainDateTime): number {
  return plain.toZonedDateTime(tz).epochMilliseconds;
}
