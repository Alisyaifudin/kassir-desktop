---
slug: duplicate-date-pickers-dom-poke-controlled-input
title: "\"Tahun Ini\" pokes a controlled input through `document.getElementById`, and the date picker exists twice"
severity: low
category: correctness
iteration: 4
created: 2026-10-21T19:21:27.113Z
files:
  - "src/components/DateRange.tsx"
  - "src/components/Calendar.tsx"
  - "src/pages/Record/z-Header/index.tsx"
  - "src/pages/Money/History/z-TimePicker.tsx"
---

# "Tahun Ini" pokes a controlled input through `document.getElementById`, and the date picker exists twice

- **Severity:** low
- **Category:** correctness
- **Files:** `src/components/DateRange.tsx`, `src/components/Calendar.tsx`, `src/pages/Record/z-Header/index.tsx`, `src/pages/Money/History/z-TimePicker.tsx`
- **Iteration:** 4

## Summary

Two date pickers implement the same drill-down (491 + 350 lines, seven call sites), and `DateRange`'s "Tahun Ini" writes `document.getElementById("year-input") as HTMLInputElement` into an input that is controlled by React state — so the visible year and the state disagree after the click and React restores the old value on the next render. The cast also throws if the field is not mounted, and both files shadow `setInterval` with a state setter.

## Details

## Evidence

Two independent date pickers exist for the same job, and one of them writes into a controlled `input` through the DOM.

- `src/components/DateRange.tsx` — 491 lines, imported by `pages/Money/History/z-TimePicker.tsx`, `pages/Product/Detail/Performance/page.tsx`, `pages/Setting/Data/RecordDownload.tsx`, `pages/Record/Search/z-Header.tsx`.
- `src/components/Calendar.tsx` — 350 lines, imported by `pages/Record/z-Header/index.tsx`, `pages/Record/Item/z-Detail/z-PaidAt.tsx`, `pages/Record/Item/z-Detail/z-CreditAt.tsx`.

Both implement the same day/month/year drill-down with the same header (`Tahun` button, `ChevronLeft`/`ChevronRight`, "Tahun Ini") and near-identical `handleSubmitYear` clamping (`DateRange.tsx:422-446`, `Calendar.tsx:279-308`).

The "Tahun Ini" handler in `DateRange.tsx:476-488` reaches into the DOM and casts:

```tsx
<Button
  variant="outline"
  onClick={() => {
    const inputEl = document.getElementById("year-input") as HTMLInputElement;
    inputEl.value = today.year.toString();
    setInterval("month");
    setDate(today);
  }}
>
  Tahun Ini
</Button>
```

…while that same input is **controlled** by React state (`DateRange.tsx:466-473`):

```tsx
<Input
  type="number"
  value={year}
  onChange={(e) => setYear(Number(e.currentTarget.value))}
  name="year"
  id="year-input"
/>
```

`Calendar.tsx:333-345` copies the same three lines, but there the input is uncontrolled (`defaultValue={date.year}`, `Calendar.tsx:322-329`), which is the only reason it looks like it works there.

Two secondary problems in the same construct:
- The `as HTMLInputElement` cast is unchecked: `document.getElementById` returns `null` if the year field is not mounted (it is rendered unconditionally today, but nothing enforces it), and the click then throws a `TypeError` inside a React event handler → the screen goes to the error boundary.
- Both components shadow the global timer function: `const [interval, setInterval] = useState<[Interval, Interval]>(["day", "day"])` (`DateRange.tsx:65`). Anybody who later needs `window.setInterval` in that component silently gets the state setter.

## Why it matters

The year field and the calendar disagree after a "Tahun Ini" click: the state stays on the old year (`setYear` is never called), React restores the controlled value on the next render, and the visible result depends on render timing. A cashier filtering the Record list or downloading a month of records can end up looking at the wrong year and concluding the data is missing — a data-trust bug on the reporting surface, the same class as the receipt and catalogue bugs already fixed.

Having two implementations also means the two paths behave differently (the Record header calendar vs the Money history range picker) and any date-logic fix — clamping, timezone handling, `Temporal` conversion — has to be applied twice. (The same duplication pattern is filed separately for the cart; this is the second instance of it in the tree.)

## Recommended fix

1. Delete the DOM poke. Make "Tahun Ini" set state: `setYear(today.year)` (and `setInterval("month")` / `setDate(today)` as today). Delete every `document.getElementById(...) as HTMLInputElement` assignment in both files; if a focus effect is genuinely needed, use a `ref`.
2. Merge the two pickers into one `src/components/DatePicker/` (mode prop: `single` for `Calendar`'s call sites, `range` for `DateRange`'s), or at minimum extract the shared drill-down into `src/components/date-grid.tsx` plus one `use-year-input.ts` hook. Keep the two public components as thin wrappers so the seven call sites do not change.
3. Rename the shadowing state: `const [interval, setIntervalState] = useState(...)` in both while they still exist.

## Acceptance criteria

- Clicking "Tahun Ini" updates the visible year field and the calendar to the current year; no `document.getElementById` + `as HTML…Element` write remains in `src/`.
- One implementation of the day/month/year drill-down; the seven call sites keep their current props.
- A test with `@testing-library/react` (already a devDependency) renders the picker, clicks "Tahun Ini", and asserts the input's value and the selected date.
- `bun test`, `bun run typecheck`, `bun run lint` green.

## Verification

- `bun test` (new component test) — the harness already renders components in `@happy-dom/global-registrator`.
- Manual: `/records` → open the date dialog → type a year → "Tahun Ini" → the field and the grid show the current year; same through `/money/history` and `/setting/data` download.
- `rg 'getElementById\("year-input"\)' src` returns nothing.
