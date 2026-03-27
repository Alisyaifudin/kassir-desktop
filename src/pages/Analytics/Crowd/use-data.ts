import { Temporal } from "temporal-polyfill";
import { db } from "~/database";
import { useTime } from "../use-time";
import { Result } from "~/lib/result";
import { Effect } from "effect";
import { getVisitors } from "../utils/group-items";
import { setSummary } from "./z-Summary";
import Decimal from "decimal.js";
import { tz } from "~/lib/constants";

const KEY = "crowd";

export function useData() {
  const [time] = useTime();
  const [start, end] = getRange(time);
  const res = Result.use({
    fn: () => program({ start, end, time }),
    key: KEY,
    deps: [start, end, time],
  });
  return res;
}

function getRange(time: number): [number, number] {
  const tz = Temporal.Now.timeZoneId();
  const t = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
  const day = t.dayOfWeek - 1;
  const days = t.daysInWeek;
  const start = t.subtract(Temporal.Duration.from({ days: day })).startOfDay();
  const end = start.add(Temporal.Duration.from({ days }));
  return [start.epochMilliseconds, end.epochMilliseconds];
}

function program({ start, end, time }: { time: number; start: number; end: number }) {
  return db.record.get.byRange(start, end).pipe(
    Effect.map((records) => {
      const startOfDay = Temporal.Instant.fromEpochMilliseconds(time)
        .toZonedDateTimeISO(tz)
        .startOfDay();
      const endOfDay = startOfDay.add(Temporal.Duration.from({ days: 1 }));
      const daily = getVisitors({
        records,
        interval: "day",
        start: startOfDay.epochMilliseconds,
        end: endOfDay.epochMilliseconds,
      });
      const weekly = getVisitors({
        records,
        interval: "week",
        start,
        end,
      });
      setSummary({
        loading: false,
        daily: daily.visitors.length === 0 ? 0 : Decimal.sum(...daily.visitors).toNumber(),
        weekly: weekly.visitors.length === 0 ? 0 : Decimal.sum(...weekly.visitors).toNumber(),
      });
      return { daily, weekly };
    }),
  );
}
