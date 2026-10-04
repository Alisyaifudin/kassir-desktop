import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { Stream } from "effect";
import { Temporal } from "temporal-polyfill";
import { useQuery } from "~/components/Loader";
import { formatDate, monthNames } from "~/lib/date";
import { tz } from "~/lib/constants";
import { service } from "~/services";
import type { ProductPerformance, ProductSale } from "~/services/product";

export type Interval = "day" | "week" | "month";
const INTERVALS = ["day", "week", "month"] as const;

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function defaultRange(): { from: number; to: number } {
  const today = Temporal.Now.zonedDateTimeISO(tz).startOfDay();
  return {
    from: today.subtract(Temporal.Duration.from({ days: 29 })).epochMilliseconds,
    to: today.add(Temporal.Duration.from({ days: 1 })).epochMilliseconds,
  };
}

export function usePerformanceRange() {
  const [params, setParams] = useSearchParams();
  const defaults = useMemo(defaultRange, []);
  const from = Number(params.get("from")) || defaults.from;
  const to = Number(params.get("to")) || defaults.to;
  const interval = oneOf(params.get("interval"), INTERVALS, "day");

  const setRange = (nextFrom: number, nextTo: number) => {
    setParams(
      (old) => {
        const s = new URLSearchParams(old);
        s.set("from", String(nextFrom));
        s.set("to", String(nextTo));
        return s;
      },
      { replace: true },
    );
  };

  const setInterval = (next: Interval) => {
    setParams(
      (old) => {
        const s = new URLSearchParams(old);
        if (next === "day") s.delete("interval");
        else s.set("interval", next);
        return s;
      },
      { replace: true },
    );
  };

  return { from, to, interval, setRange, setInterval } as const;
}

export function usePerformance(id: string, from: number, to: number) {
  return useQuery(
    () => Stream.fromEffect(service.product.get.performance(id, { from, to })),
    [id, from, to],
  );
}

function alignStart(value: number, interval: Interval): number {
  const date = Temporal.Instant.fromEpochMilliseconds(value).toZonedDateTimeISO(tz).startOfDay();
  switch (interval) {
    case "day":
      return date.epochMilliseconds;
    case "week":
      return date.subtract(Temporal.Duration.from({ days: date.dayOfWeek - 1 })).epochMilliseconds;
    case "month":
      return date.with({ day: 1 }).epochMilliseconds;
  }
}

function step(date: Temporal.ZonedDateTime, interval: Interval): Temporal.ZonedDateTime {
  switch (interval) {
    case "day":
      return date.add(Temporal.Duration.from({ days: 1 }));
    case "week":
      return date.add(Temporal.Duration.from({ weeks: 1 }));
    case "month":
      return date.add(Temporal.Duration.from({ months: 1 }));
  }
}

function bucketStarts(from: number, to: number, interval: Interval): number[] {
  const starts: number[] = [];
  let cursor = Temporal.Instant.fromEpochMilliseconds(
    alignStart(from, interval),
  ).toZonedDateTimeISO(tz);
  const end = alignStart(to, interval);
  while (cursor.epochMilliseconds <= end) {
    starts.push(cursor.epochMilliseconds);
    cursor = step(cursor, interval);
  }
  return starts;
}

export function labelOf(start: number, interval: Interval): string {
  const date = Temporal.Instant.fromEpochMilliseconds(start).toZonedDateTimeISO(tz);
  if (interval === "month") return `${monthNames[date.month]} ${String(date.year).slice(-2)}`;
  return formatDate(start);
}

export type Bin = { label: string; qty: number; revenue: number; capital: number; profit: number };

export function aggregate(
  sales: ProductSale[],
  from: number,
  to: number,
  interval: Interval,
): Bin[] {
  const map = new Map<number, Bin>();
  for (const sale of sales) {
    const start = alignStart(sale.paidAt, interval);
    const bin =
      map.get(start) ??
      { label: labelOf(start, interval), qty: 0, revenue: 0, capital: 0, profit: 0 };
    bin.qty += sale.qty;
    bin.revenue += sale.total;
    bin.capital += sale.capital * sale.qty;
    bin.profit += sale.total - sale.capital * sale.qty;
    map.set(start, bin);
  }
  return bucketStarts(from, to, interval).map(
    (start) =>
      map.get(start) ?? {
        label: labelOf(start, interval),
        qty: 0,
        revenue: 0,
        capital: 0,
        profit: 0,
      },
  );
}

export type ListingAggregate = { name: string; qty: number; revenue: number; profit: number };

export function byListing(sales: ProductSale[]): ListingAggregate[] {
  const map = new Map<string, ListingAggregate>();
  for (const sale of sales) {
    const row = map.get(sale.name) ?? { name: sale.name, qty: 0, revenue: 0, profit: 0 };
    row.qty += sale.qty;
    row.revenue += sale.total;
    row.profit += sale.total - sale.capital * sale.qty;
    map.set(sale.name, row);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export function stockSeries(
  performance: ProductPerformance,
  from: number,
  to: number,
  interval: Interval,
): { label: string; value: number }[] {
  const starts = bucketStarts(from, to, interval);
  const events = performance.stockEvents;
  let cumulative = performance.stockOpening;
  let index = 0;

  return starts.map((start, i) => {
    const next = i + 1 < starts.length ? starts[i + 1] : Number.POSITIVE_INFINITY;
    while (index < events.length && events[index].createdAt < next) {
      cumulative += events[index].value;
      index += 1;
    }
    return { label: labelOf(start, interval), value: cumulative };
  });
}

export function totals(performance: ProductPerformance) {
  let qty = 0;
  let revenue = 0;
  let capital = 0;
  for (const sale of performance.sales) {
    qty += sale.qty;
    revenue += sale.total;
    capital += sale.capital * sale.qty;
  }
  const profit = revenue - capital;
  return {
    qty,
    revenue,
    capital,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
  };
}
