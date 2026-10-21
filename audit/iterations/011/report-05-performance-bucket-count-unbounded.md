---
slug: performance-bucket-count-unbounded
title: "The performance charts build an unbounded bucket per day (46k buckets for a 1900→today range) and render it on the main thread"
severity: medium
category: performance
iteration: 11
created: 2026-10-21T22:17:33.280Z
files:
  - "src/pages/Product/Detail/Performance/use-performance.ts"
  - "src/pages/Product/Detail/Performance/page.tsx"
  - "src/pages/Product/Detail/Performance/z-Charts.tsx"
  - "src/components/DateRange.tsx"
---

# The performance charts build an unbounded bucket per day (46k buckets for a 1900→today range) and render it on the main thread

- **Severity:** medium
- **Category:** performance
- **Files:** `src/pages/Product/Detail/Performance/use-performance.ts`, `src/pages/Product/Detail/Performance/page.tsx`, `src/pages/Product/Detail/Performance/z-Charts.tsx`, `src/components/DateRange.tsx`
- **Iteration:** 11

## Summary

The product-performance screen builds one chart bucket per day/week/month with no cap and no memoisation, and its date picker accepts any year from 1900 to 2100 — so "Dari 2000, interval Hari" builds tens of thousands of Temporal dates and ~3× that many chart points inside four fixed-height charts on the main thread. The same module trusts `?from`/`?to` without clamping or ordering, so an inverted range renders four silently empty charts instead of a message.

## Details

## Evidence

`bucketStarts` turns a date range into one bucket per day/week/month with no upper bound:

```ts
// src/pages/Product/Detail/Performance/use-performance.ts:90-101
function bucketStarts(from: number, to: number, interval: Interval): number[] {
  const starts: number[] = [];
  let cursor = Temporal.Instant.fromEpochMilliseconds(alignStart(from, interval))
    .toZonedDateTimeISO(tz);
  const end = alignStart(to, interval);
  while (cursor.epochMilliseconds <= end) {
    starts.push(cursor.epochMilliseconds);
    cursor = step(cursor, interval);
  }
  return starts;
}
```

The page calls it three times per render (once through `aggregate`, once through `stockSeries`, once per chart's `labelOf`) and passes the result straight to four recharts axes:

```tsx
// src/pages/Product/Detail/Performance/page.tsx:52-61
const bins = aggregate(data.sales, from, to, interval);
const listing = byListing(data.sales);
const stock = stockSeries(data, from, to, interval);
... <QtyChart data={bins} /> <RevenueChart data={bins} /> <ProfitChart data={bins} />
```

The only thing standing between the UI and an unbounded range is the interval selector. `Hari` is the default, and `DateRange`'s year drill-down allows any year from 1900 to 2100 (`src/components/DateRange.tsx:22-34`), so "Dari" = 1900-01-01 → "Sampai" = today is a few clicks in one dialog and produces ~46,000 daily buckets. That is ~46k `Temporal.ZonedDateTime.add` calls, ~46k `labelOf` string formats, and ~138k SVG data points across three charts inside a fixed `h-56` frame — a multi-second main-thread block on the till, then an unreadable axis.

The same module also happily runs with an unbounded or inverted range if the query string ever carries one, because the params are trusted after a bare numeric coercion and never clamped or ordered:

```ts
// use-performance.ts:29-31
const from = Number(params.get("from")) || defaults.from;
const to = Number(params.get("to")) || defaults.to;
```

`from > to` is not possible from `DateRange` (it clamps in `setTime`, `DateRange.tsx:103-112`), but nothing in `usePerformanceRange` states or enforces that invariant — the module's correctness currently depends on a different component's UI logic. And with `from > to`, `aggregate` returns `[]` and the four charts render empty boxes with no "tidak ada data" message.

## Why it matters

This is the one screen that aggregates the whole sales history, and its cost is set entirely by what the operator typed into a date picker that accepts 1900. A frozen webview during a report is exactly the desktop-UX failure this audit track cares about (the printer path was fixed for the same reason — blocking the event loop is not acceptable here), and the empty-chart state gives no hint that the range — not the data — is the problem.

## Recommended fix

1. Cap the number of buckets, not the range: compute the bucket count first (`ceil(span / unit)`) and, above a threshold (e.g. 400 for `day`, 260 for `week`, 120 for `month`), either auto-promote the interval (`Hari` → `Minggu` → `Bulan`) with a visible note, or aggregate into at most N buckets of an auto-chosen size. Never build the whole array first.
2. Memoise the three derivations so a re-render (interval hover, resize, dialog open) does not recompute them: `const bins = useMemo(() => aggregate(...), [data.sales, from, to, interval])`.
3. Validate the range where it enters the module: clamp `from`/`to` to `[timeLowest, timeHighest]` — export those constants from `DateRange` (or a shared `lib/date` module) instead of duplicating 1900/2100 knowledge — and swap them when `from > to`. Render an explicit empty state ("Tidak ada penjualan pada rentang ini") when `bins.every(b => b.qty === 0)`.
4. Add a unit test on `bucketStarts`/`aggregate`: a 1900→today range with `interval: "day"` yields a bounded array (≤ the cap) and an inverted range yields `[]` plus a flag the page can render.

## Acceptance criteria

- Picking 1900-01-01 → today with `Hari` selected renders in under ~200 ms and shows at most the capped number of buckets (with the effective interval visible).
- `aggregate`/`stockSeries` are `useMemo`d on `[sales, from, to, interval]`.
- `from > to` and out-of-bounds values are normalised inside `usePerformanceRange`, and an empty result renders a message rather than four blank charts.
- A unit test pins the cap and the inverted-range behaviour.

## Verification

- `bun test src/pages/Product/Detail/Performance` (new cases), `npx tsc --noEmit`, `npx eslint . --max-warnings 0`.
- Manual: `/products/<id>/performance`, set Dari = 2000-01-01, interval Hari — the page must stay responsive and say which interval it used.
