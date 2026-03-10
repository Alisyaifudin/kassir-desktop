import { Temporal } from "temporal-polyfill";
import { Interval } from "./use-interval";

export function getRange(timestamp: number, interval: Interval): [number, number] {
  const tz = Temporal.Now.timeZoneId();
  switch (interval) {
    case "all":
      return [0, 4099680000000]; // 2100 gmt
    case "month": {
      const t = Temporal.Instant.fromEpochMilliseconds(timestamp).toZonedDateTimeISO(tz);
      const start = Temporal.ZonedDateTime.from({
        timeZone: tz,
        year: t.year,
        month: t.month,
        day: 1,
      }).startOfDay();
      const end = start.add(Temporal.Duration.from({ months: 1 }));
      return [start.epochMilliseconds, end.epochMilliseconds];
    }
    case "year": {
      const t = Temporal.Instant.fromEpochMilliseconds(timestamp).toZonedDateTimeISO(tz);
      const start = Temporal.ZonedDateTime.from({
        timeZone: tz,
        year: t.year,
        month: 1,
        day: 1,
      }).startOfDay();
      const end = start.add(Temporal.Duration.from({ years: 1 }));
      return [start.epochMilliseconds, end.epochMilliseconds];
    }
  }
}
