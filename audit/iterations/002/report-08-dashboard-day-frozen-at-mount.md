---
slug: dashboard-day-frozen-at-mount
title: "The dashboard's \"today\" is frozen at mount, so a shop PC open past midnight reports yesterday as today"
severity: low
category: correctness
iteration: 2
created: 2026-10-21T18:15:26.319Z
files:
  - "src/pages/Home/use-stats.ts"
  - "src/pages/Home/z-IncomeCard.tsx"
  - "src/pages/Money/use-range.tsx"
  - "src/pages/Record/use-records.ts"
  - "src/pages/Record/use-time.ts"
---

# The dashboard's "today" is frozen at mount, so a shop PC open past midnight reports yesterday as today

- **Severity:** low
- **Category:** correctness
- **Files:** `src/pages/Home/use-stats.ts`, `src/pages/Home/z-IncomeCard.tsx`, `src/pages/Money/use-range.tsx`, `src/pages/Record/use-records.ts`, `src/pages/Record/use-time.ts`
- **Iteration:** 2

## Summary

The Beranda dashboard derives "today" once, inside `useMemo(dayRanges, [])`, and queries on `[range.today.start]` with no record-revision dep — so an app left open across local midnight keeps showing yesterday's figures as "Pendapatan Hari Ini", and nothing short of a route remount refreshes it. `Money/use-range.tsx` freezes its default month window the same way. Every other day-scoped screen (`Record/use-records.ts`, `Debt/use-data.ts`) already subscribes to `record.get.revision`; the dashboard is the one that does not.

## Details

## Evidence

`src/pages/Home/use-stats.ts`:

```ts
/** Local-midnight boundaries for today and yesterday. */
function dayRanges() {
  const start = Temporal.Now.zonedDateTimeISO(tz).startOfDay();
  return { today: {...}, yesterday: {...} };
}

export function useStats(): Result<Stats, RecordError> {
  const range = useMemo(dayRanges, []);          // computed once, for the life of the mount
  return useQuery(
    () => Stream.fromEffect(/* record.count.summary(today) + summary(yesterday) */),
    [range.today.start],                          // never changes without a remount
  );
}
```

The card that consumes it is labelled as a live figure —
`src/pages/Home/z-IncomeCard.tsx`: `label="Pendapatan Hari Ini"` — and the page is
what the app opens on (`src/route.tsx` → `homeRoute` at `/`).

Two consequences:

1. **The day never rolls over.** `Temporal.Now` is read once inside
   `useMemo(..., [])`. An app left open across local midnight (a shop PC that is
   never closed — the normal case for this class of app) keeps showing yesterday
   as "Hari Ini", with yesterday-as-"Kemarin" too, until the Home route is
   remounted.
2. **There is no revision dependency.** Every other day-scoped screen re-queries
   on the record write counter — `src/pages/Record/use-records.ts` and
   `src/pages/Debt/use-data.ts` both do
   `useStream(service.record.get.revision, () => 0)` and put it in the query deps.
   `useStats` does not, so even a commit that lands while Home is mounted (a second
   window today, a sync import tomorrow) leaves the dashboard numbers stale with no
   way to refresh other than navigating away and back.

Same pattern, same root cause, second site: `src/pages/Money/use-range.tsx`
freezes its default range at mount —

```ts
const defaults = useMemo(() => {
  const today = Temporal.Now.zonedDateTimeISO(tz).startOfDay();
  return { start: today.subtract({ months: 1 }).epochMilliseconds, end: today.epochMilliseconds };
}, []);
```

so the Money page's default "last month" window is anchored to the day the page
was first opened. `src/pages/Record/use-time.ts` avoids this by computing `getDay`
on every render, but only advances when something else causes a render.

## Why it matters

This is the "desktop app left running" failure mode the audit brief calls out:
no page reload, no navigation, no timeout. A shopkeeper glancing at Beranda after
midnight to see how the day is starting reads yesterday's takings as today's —
and the same number is what they will quote when the cash drawer does not match.
It is a display-only bug, but it is a *reporting* surface: the numbers look
authoritative and are not.

## Recommended fix

1. Add one shared hook, e.g. `src/hooks/use-day-start.ts`:

```ts
/** Local midnight, re-armed at the next local midnight and on window focus. */
export function useDayStart(): number {
  const [dayStart, setDayStart] = useState(() => Temporal.Now.zonedDateTimeISO(tz).startOfDay().epochMilliseconds);
  useEffect(() => {
    function refresh() {
      const next = Temporal.Now.zonedDateTimeISO(tz).startOfDay().epochMilliseconds;
      setDayStart((current) => (current === next ? current : next));
    }
    // Sleep until the next local midnight, then re-arm; also catch a resumed window.
    const now = Temporal.Now.instant();
    const untilMidnight = /* next midnight - now, clamped */;
    const timer = setTimeout(refresh, untilMidnight);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [dayStart]);
  return dayStart;
}
```

   (Temporal has `Instant.until`, so the timeout needs no `setInterval` polling and
   no drift.)
2. Use it in `useStats` for the query deps **and** derive `yesterday` from it, and
   in `useRange`/`useTime` for their defaults.
3. Add `useRecordRevision()` (already exported from
   `src/pages/Record/use-records.ts`) to the `useStats` deps so a commit refreshes
   the dashboard.
4. Keep the `small:`-friendly layout — no visual change intended.

## Acceptance criteria

- `useStats` recomputes its ranges when the local day changes, without a remount:
  a test with a faked `Temporal.Now` (or an injectable clock) that advances past
  midnight shows a new `today` query.
- Home reflects a commit made while it is mounted (revision dependency present).
- `Money`'s default range follows the day on the same terms.
- No `setInterval` polling remains for date boundaries.

## Verification

```
bun test src/pages/Home src/pages/Money
bun run typecheck
```

Manual: open Beranda, set the OS clock to 23:59, wait past midnight (or set the
clock forward a day and focus the window) — "Pendapatan Hari Ini" must reset to
the new day's numbers without navigating.
