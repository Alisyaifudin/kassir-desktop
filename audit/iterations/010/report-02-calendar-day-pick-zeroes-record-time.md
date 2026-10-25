---
slug: calendar-day-pick-zeroes-record-time
title: "Picking a day in the record's date editor zeroes the time-of-day, permanently rewinding the receipt and the day list to 00:00"
severity: medium
category: correctness
iteration: 10
created: 2026-10-21T21:51:07.620Z
files:
  - "src/components/Calendar.tsx"
  - "src/pages/Record/Item/z-Detail/z-PaidAt.tsx"
  - "src/pages/Record/Item/z-Detail/z-CreditAt.tsx"
  - "src/pages/Record/Item/z-Detail/use-change-paid-at.ts"
  - "src/services/record/live.ts"
  - "src/lib/receipt/build-header.ts"
---

# Picking a day in the record's date editor zeroes the time-of-day, permanently rewinding the receipt and the day list to 00:00

- **Severity:** medium
- **Category:** correctness
- **Files:** `src/components/Calendar.tsx`, `src/pages/Record/Item/z-Detail/z-PaidAt.tsx`, `src/pages/Record/Item/z-Detail/z-CreditAt.tsx`, `src/pages/Record/Item/z-Detail/use-change-paid-at.ts`, `src/services/record/live.ts`, `src/lib/receipt/build-header.ts`
- **Iteration:** 10

## Summary

`Calendar` returns a start-of-day instant for every day click, and two of its callers use it to edit a persisted timestamp (`record_paid_at`, `record_credit_at`). Moving a sale to another day therefore rewrites its clock to 00:00 — which changes the day list's time sort, the record's `date`, and the time printed on a reprinted receipt — with no UI hint that the time was dropped and no way to put it back (the picker has no time control).

## Details

## Evidence

`src/components/Calendar.tsx:176-199` — a day cell click and the "Hari Ini" footer both hand back a **start-of-day** instant:

```tsx
{days.map(([day, epoch, inside]) => (
  <Button ... onClick={() => { setShowTime(epoch); setTime(epoch); }}>
    {day}
  </Button>
))}
...
<Button variant="outline" onClick={() => setTime(today.epochMilliseconds)}>Hari Ini</Button>
```

`epoch` comes from `startOfMonth.subtract(...)` / `add(Duration{days:1})` iterated in days, i.e. local midnight (`days` is built at lines 118-133), and `today` is `Temporal.Now.instant().toZonedDateTimeISO(tz).startOfDay()` (line 101). The month path is the same (`Calendar.tsx:210-218` → `day: 1`).

The component is used to **edit persisted timestamps**, not just to filter by day:

- `src/pages/Record/Item/z-Detail/z-PaidAt.tsx:19-24` — `time={paidAt}`, `setTime={change}`, where `change` runs `service.record.set.paidAt(id, ts)` (`use-change-paid-at.ts:11-14`), a plain `UPDATE records SET record_paid_at = $1 …` (`src/services/record/live.ts:1429-1441`).
- `src/pages/Record/Item/z-Detail/z-CreditAt.tsx:19` — the same for `record_credit_at`.
- `src/pages/Record/z-Header/index.tsx:60` — the day filter (time irrelevant here, so this one is fine).

And the time is displayed, so the loss is visible:

- `src/pages/Record/Item/z-Detail/z-PaidAt.tsx:23` — `Dibayar: {formatTime(paidAt, "long")} …`
- `src/lib/receipt/build-header.ts:44-48` — the printed receipt: `formatDate(printedAt, "short") + ", " + formatTime(printedAt, "short")`.
- `src/pages/Record/z-Record/List.tsx:140` — `formatTime(record.date)` in the day list.

So moving a sale that was made at 14:32 to yesterday is not "move it to yesterday": it rewrites 14:32 → 00:00, the record list re-sorts it to the bottom of its day (14:32 → 00:00 changes the order the cashier just sorted by time), `record.date` becomes midnight, and a reprinted receipt says the sale happened at 00:00. Nothing in the UI says the time was discarded.

There is no test for `Calendar` (`rg -l "Calendar|DateRange|useScroll" src --glob "*.test.*"` → no hits), and `Calendar` is not covered by any of the previous iterations' reports.

## Why it matters

`record_paid_at` is the record's business timestamp: it drives the day list and its sort, the receipt header, the debt list order (`DebtRecord.paidAt`) and the day-scoped reports (`use-record-revision`, Home stats). Editing the date to correct a mis-keyed day is a normal correction; silently zeroing the clock corrupts the audit trail of when the money was taken, and the cashier has no way to put the time back (there is no time picker anywhere — `Calendar` only offers days). This is permanent history, not a display glitch.

## Recommended fix

Keep the clock reading when only the day changes. In `Calendar`'s `Content`, carry the incoming `time`'s time-of-day onto the picked day and let a caller that genuinely wants midnight ask for it:

```ts
// day cell
const picked = Temporal.Instant.fromEpochMilliseconds(epoch)
  .toZonedDateTimeISO(tz)
  .add({ hours: original.hour, minutes: original.minute, seconds: original.second, milliseconds: original.millisecond });
setTime(picked.epochMilliseconds);
```

where `original` is `Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz)` of the prop. Apply the same rule to the "Hari Ini" button and to the month/year drill-down (which currently hard-code `day: 1` / `month: 1`), and to the clamp helpers in `DateRange.tsx` if the same component is reused for editing there.

If any caller *does* want start-of-day, give `Calendar` an explicit prop (`granularity?: "day" | "instant"`) instead of making midnight the implicit answer for everyone, and use it in `Record/z-Header` where the value is only a filter bound.

## Acceptance criteria

- Picking another day in the record's "Dibayar" / "Kredit" editor preserves the hour, minute and second; only the calendar date changes.
- The reprinted receipt and the day list show the preserved time.
- "Hari Ini" keeps the clock reading too (it means "today, same time of day").
- A caller that needs a day boundary (the Records day filter) still gets start-of-day — pinned by a test.
- `Calendar` has a unit test for the day-pick, the "Hari Ini" path and the month/year drill-down.

## Verification

1. New test: `src/components/Calendar.test.tsx` — render with `time` = a known 14:32 instant in `tz`, simulate a click on a different day, assert the epoch passed to `setTime` is that day at 14:32.
2. Manual: open a record paid at 14:32, move it to yesterday, reopen it — the header must still read "Dibayar: 14:32 …" and the receipt the same.
3. `bun test`, `tsc --noEmit`, `eslint --max-warnings 0` stay clean.
