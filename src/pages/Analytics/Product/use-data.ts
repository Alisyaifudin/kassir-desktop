import { Temporal } from "temporal-polyfill";
import { db } from "~/database-effect";
import { useTime } from "../use-time";
import { useInterval } from "../use-interval";
import { Result } from "~/lib/result";
import { Effect } from "effect";
import { setSummary } from "./z-Summary";
import { useMode } from "../use-mode";

const KEY = "analytics-products";

export function useData() {
  const [time] = useTime();
  const [int] = useInterval("day");
  const [mode] = useMode();
  const interval = int === "year" ? "month" : int;
  const [start, end] = getRange(interval, time);
  const res = Result.use({
    fn: () => program({ start, end, mode }),
    key: KEY,
    revalidateOn: {
      unmount: true,
    },
    deps: [start, end, mode, interval],
  });
  return res;
}

function getRange(interval: "week" | "month" | "day", time: number): [number, number] {
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
    case "day": {
      const start = Temporal.Instant.fromEpochMilliseconds(time)
        .toZonedDateTimeISO(tz)
        .startOfDay();
      const end = start.add(Temporal.Duration.from({ days: 1 }));
      return [start.epochMilliseconds, end.epochMilliseconds];
    }
  }
}

function estCapital(capital: number, price: number, qty: number, total: number): number {
  if (capital === 0) {
    if (price < 10000) {
      return 0.1 * price;
    } else {
      return 5000;
    }
  }
  return total - capital * qty;
}

function program({ start, end, mode }: { start: number; end: number; mode: DB.Mode }) {
  return db.product.get.byRange(start, end).pipe(
    Effect.map((products) => {
      let totalQty = 0;
      let profit = 0;
      const items = products.filter((a) => a.mode === mode);
      for (const item of items) {
        totalQty += item.qty;
        if (item.kind === "raw") {
          profit += estCapital(item.capital, item.price, item.qty, item.total);
          continue;
        }
        for (const it of item.items) {
          profit += estCapital(item.capital, it.price, it.qty, it.total);
        }
      }
      setSummary({ loading: false, product: totalQty, profit });
      return items;
    }),
  );
}
