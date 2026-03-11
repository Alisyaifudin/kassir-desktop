import { Effect } from "effect";
import { useMemo } from "react";
import { Temporal } from "temporal-polyfill";
import { db } from "~/database-effect";
import { Result } from "~/lib/result";
import { setSummary } from "./z-Summary";
import { getFlow } from "../utils/group-items";
import { useInterval } from "../use-interval";
import Decimal from "decimal.js";
import { useTime } from "../use-time";

const KEY = "net";

export function useData() {
  const [int] = useInterval("month");
  const interval = int === "day" ? "week" : int;
  const [time] = useTime();
  const [start, end] = useMemo(() => {
    return getRange(interval, time);
  }, [interval, time]);
  const res = Result.use({
    fn: () => program({ start, end, interval }),
    key: KEY,
    revalidateOn: {
      unmount: true,
    },
    deps: [start, end, interval],
  });
  return res;
}

function getRange(interval: "week" | "month" | "year", time: number): [number, number] {
  const tz = Temporal.Now.timeZoneId();
  switch (interval) {
    case "week": {
      const t = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
      const day = t.dayOfWeek - 1;
      const days = t.daysInWeek;
      const start = t.subtract(Temporal.Duration.from({ days: day })).startOfDay();
      const end = start.add(Temporal.Duration.from({ days }));
      return [start.epochMilliseconds, end.epochMilliseconds];
    }
    case "month": {
      const t = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
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
      const t = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
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

function program({
  start,
  end,
  interval,
}: {
  start: number;
  end: number;
  interval: "week" | "month" | "year";
}) {
  return db.record.get.byRange(start, end).pipe(
    Effect.map((records) => {
      const { revenues, debts, labels, spendings } = getFlow({
        records,
        start,
        end,
        interval,
      });
      const deltaT = (end - start) / (labels.length || 1);
      const profits = revenues.map((rev, i) => ({
        number: new Decimal(rev).minus(spendings[i]).plus(debts[i]).toNumber(),
        timestamp: start + i * deltaT,
      }));
      setSummary({
        loading: false,
        profit: profits.length === 0 ? 0 : Decimal.sum(...profits.map((p) => p.number)).toNumber(),
      });
      return { labels, profits };
    }),
  );
}
