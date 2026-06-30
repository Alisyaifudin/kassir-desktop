// import { z } from "zod";
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

export const monthMap = {
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

// export const dayNames = {
//   1: "Senin",
//   2: "Selasa",
//   3: "Rabu",
//   4: "Kamis",
//   5: "Jumat",
//   6: "Sabtu",
//   7: "Minggu",
// } as Record<number, string>;

// export function getDayName(epochMilli: number) {
//   const tz = Temporal.Now.timeZoneId();
//   const date = Temporal.Instant.fromEpochMilliseconds(epochMilli).toZonedDateTimeISO(tz);
//   return dayNames[date.dayOfWeek];
// }

export function formatDate(date: Temporal.PlainDate, type: "short" | "long" = "short"): string {
  const { day, month, year } = date;
  switch (type) {
    case "short":
      return `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`;
    case "long":
      return `${day} ${monthMap[month]} ${year}`;
  }
}

function formatTime(time: Temporal.PlainTime, type: "short" | "long" = "short") {
  const { hour, minute, second } = time;
  const hourMin = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  if (type === "short") {
    return hourMin;
  }
  return `${hourMin}:${second.toString().padStart(2, "0")}`;
}

export function formatEpochtime(
  ms: number,
  option?: {
    date?: "short" | "long";
    time?: "short" | "long";
  },
): string {
  const datetime = Temporal.Instant.fromEpochMilliseconds(ms).toZonedDateTimeISO(tz);
  const { day, month, year, hour, minute, second } = datetime;
  const date = new Temporal.PlainDate(year, month, day);
  const time = new Temporal.PlainTime(hour, minute, second);
  return `${formatTime(time, option?.time)}, ${formatDate(date, option?.date)}`;
}

// export const dateStringSchema = z.string().regex(
//   /^\d+-\d{2}-\d{2}$/, // Regular expression to match any number of digits for the year, followed by MM-DD
//   "Tanggal tidak valid",
// );

// export function formatTime(epochMilli: number, format: "long" | "short" = "short"): string {
//   const tz = Temporal.Now.timeZoneId();
//   const date = Temporal.Instant.fromEpochMilliseconds(epochMilli).toZonedDateTimeISO(tz);
//   const { hour, minute, second } = date;
//   switch (format) {
//     case "long":
//       return `${hour}:${minute.toString().padStart(2, "0")}:${second.toString().padStart(2, "0")}`;
//     case "short":
//       return `${hour}:${minute.toString().padStart(2, "0")}`;
//   }
// }

// export function dateToEpoch(date: string): number {
//   const [year, month, day] = date.split("-").map(Number);
//   const tz = Temporal.Now.timeZoneId();
//   const t = Temporal.ZonedDateTime.from({ timeZone: tz, year, month, day }).startOfDay()
//     .epochMilliseconds;
//   return t;
// }

// export function getDayOrder(epochMilli: number) {
//   const tz = Temporal.Now.timeZoneId();
//   const date = Temporal.Instant.fromEpochMilliseconds(epochMilli).toZonedDateTimeISO(tz);
//   return date.day;
// }
