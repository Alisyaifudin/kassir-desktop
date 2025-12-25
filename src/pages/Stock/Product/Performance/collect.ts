import { Temporal } from "temporal-polyfill";
import { Interval } from "./use-interval";
import { ProductHistory } from "~/database/product/history-range";
import { MONTHS } from "~/lib/constants";

export type Data = {
  count: number;
  bin: Bin;
};

type Bin = {
  start: number;
  end: number;
  label: string;
};

export function getBins(interval: Interval, start: number, end: number): Bin[] {
  const tz = Temporal.Now.timeZoneId();
  switch (interval) {
    case "month": {
      const t = Temporal.Instant.fromEpochMilliseconds(start).toZonedDateTimeISO(tz);
      let startOfDay = Temporal.ZonedDateTime.from({
        timeZone: tz,
        year: t.year,
        month: t.month,
        day: 1,
      }).startOfDay();
      const days = Array.from({ length: t.daysInMonth }).map((_, i) => i + 1);
      const bins: Bin[] = [];
      for (const day of days) {
        const endOfDay = startOfDay.add(Temporal.Duration.from({ days: 1 }));
        bins.push({
          start: startOfDay.epochMilliseconds,
          end: endOfDay.epochMilliseconds,
          label: day.toString(),
        });
        startOfDay = endOfDay;
      }
      return bins;
    }
    case "year": {
      const t = Temporal.Instant.fromEpochMilliseconds(start).toZonedDateTimeISO(tz);
      let startOfMonth = Temporal.ZonedDateTime.from({
        timeZone: tz,
        year: t.year,
        month: 1,
        day: 1,
      }).startOfDay();
      const bins: Bin[] = [];
      for (const month of MONTHS) {
        const end = startOfMonth.add(Temporal.Duration.from({ months: 1 }));
        bins.push({
          start: startOfMonth.epochMilliseconds,
          end: end.epochMilliseconds,
          label: month,
        });
        startOfMonth = end;
      }
      return bins;
    }
    case "all": {
      return allBins(start, end);
    }
  }
}

function allBins(start: number, end: number): Bin[] {
  const dur = Temporal.Duration.from({ milliseconds: end - start });
  const tz = Temporal.Now.timeZoneId();
  if (dur.days < 5 * 365) {
    const t = Temporal.Instant.fromEpochMilliseconds(start).toZonedDateTimeISO(tz).startOfDay();
    let startOfMonth = Temporal.ZonedDateTime.from({
      timeZone: tz,
      year: t.year,
      month: t.month,
      day: 1,
    }).startOfDay();
    const bins: Bin[] = [];
    while (startOfMonth.epochMilliseconds < end) {
      const endOfMonth = startOfMonth.add(Temporal.Duration.from({ months: 1 }));
      const label = `${MONTHS[startOfMonth.month - 1]} ${startOfMonth.year}`;
      bins.push({
        start: startOfMonth.epochMilliseconds,
        end: endOfMonth.epochMilliseconds,
        label,
      });
      startOfMonth = endOfMonth;
    }
    return bins;
  }
  if (dur.days < 10 * 365) {
    const t = Temporal.Instant.fromEpochMilliseconds(start).toZonedDateTimeISO(tz).startOfDay();
    const startMonth = Math.floor((t.month - 1) / 2) * 2 + 1;
    let startOfMonth = Temporal.ZonedDateTime.from({
      timeZone: tz,
      year: t.year,
      month: startMonth,
      day: 1,
    }).startOfDay();
    const bins: Bin[] = [];
    while (startOfMonth.epochMilliseconds < end) {
      const endOfMonth = startOfMonth.add(Temporal.Duration.from({ months: 2 }));
      const label = `${MONTHS[startOfMonth.month - 1]} - ${MONTHS[startOfMonth.month]}, ${
        startOfMonth.year
      }`;
      bins.push({
        start: startOfMonth.epochMilliseconds,
        end: endOfMonth.epochMilliseconds,
        label,
      });
      startOfMonth = endOfMonth;
    }
    return bins;
  }
  if (dur.days < 20 * 365) {
    const t = Temporal.Instant.fromEpochMilliseconds(start).toZonedDateTimeISO(tz).startOfDay();
    const startMonth = Math.floor((t.month - 1) / 3) * 3 + 1;
    let startOfMonth = Temporal.ZonedDateTime.from({
      timeZone: tz,
      year: t.year,
      month: startMonth,
      day: 1,
    }).startOfDay();
    const bins: Bin[] = [];
    while (startOfMonth.epochMilliseconds < end) {
      const endOfMonth = startOfMonth.add(Temporal.Duration.from({ months: 3 }));
      const label = `${MONTHS[startOfMonth.month - 1]} - ${MONTHS[startOfMonth.month + 1]}, ${
        startOfMonth.year
      }`;
      bins.push({
        start: startOfMonth.epochMilliseconds,
        end: endOfMonth.epochMilliseconds,
        label,
      });
      startOfMonth = endOfMonth;
    }
    return bins;
  }
  if (dur.days < 30 * 365) {
    const t = Temporal.Instant.fromEpochMilliseconds(start).toZonedDateTimeISO(tz).startOfDay();
    const startMonth = Math.floor((t.month - 1) / 6) * 6 + 1;
    let startOfMonth = Temporal.ZonedDateTime.from({
      timeZone: tz,
      year: t.year,
      month: startMonth,
      day: 1,
    }).startOfDay();
    const bins: Bin[] = [];
    while (startOfMonth.epochMilliseconds < end) {
      const endOfMonth = startOfMonth.add(Temporal.Duration.from({ months: 6 }));
      const label = `${MONTHS[startOfMonth.month - 1]} - ${MONTHS[startOfMonth.month + 4]}, ${
        startOfMonth.year
      }`;
      bins.push({
        start: startOfMonth.epochMilliseconds,
        end: endOfMonth.epochMilliseconds,
        label,
      });
      startOfMonth = endOfMonth;
    }
    return bins;
  }
  const t = Temporal.Instant.fromEpochMilliseconds(start).toZonedDateTimeISO(tz).startOfDay();
  let startTime = Temporal.ZonedDateTime.from({
    timeZone: tz,
    year: t.year,
    month: 1,
    day: 1,
  }).startOfDay();
  const bins: Bin[] = [];
  while (startTime.epochMilliseconds < end) {
    const endTime = startTime.add(Temporal.Duration.from({ years: 1 }));
    const label = `${startTime.year}`;
    bins.push({
      start: startTime.epochMilliseconds,
      end: endTime.epochMilliseconds,
      label,
    });
    startTime = endTime;
  }
  return bins;
}

export function agg(histories: ProductHistory[], bins: Bin[]): Data[] {
  return bins.map((b) => {
    const filtered = histories.filter((h) => h.timestamp < b.end && h.timestamp >= b.start);
    let count = 0;
    if (filtered.length > 0) {
      count = filtered.map((h) => h.qty).reduce((acc, cur) => acc + cur);
    }
    return {
      count,
      bin: b,
    };
  });
}
