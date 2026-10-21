---
slug: use-scroll-clobbers-hash-route
title: "The shared `Table` primitive rewrites the URL from `window.location.pathname`, dropping the hash-router route on every table scroll"
severity: high
category: correctness
iteration: 10
created: 2026-10-21T21:50:52.874Z
files:
  - "src/hooks/use-scroll.ts"
  - "src/components/ui/table.tsx"
  - "src/route.tsx"
  - "src/pages/Record/z-Record/List.tsx"
  - "src/pages/Debt/z-DebtTable.tsx"
  - "src/pages/Extra/z-Layout.tsx"
---

# The shared `Table` primitive rewrites the URL from `window.location.pathname`, dropping the hash-router route on every table scroll

- **Severity:** high
- **Category:** correctness
- **Files:** `src/hooks/use-scroll.ts`, `src/components/ui/table.tsx`, `src/route.tsx`, `src/pages/Record/z-Record/List.tsx`, `src/pages/Debt/z-DebtTable.tsx`, `src/pages/Extra/z-Layout.tsx`
- **Iteration:** 10

## Summary

`useScroll()` is mounted by the shared `Table` wrapper, so it runs on the Records day list, the record search results, the Debt table, the Product table, the Money history and the Extra list. On any scroll past 10px it calls `window.history.replaceState({}, "", `${window.location.pathname}?scroll=…`)`. The app uses `createHashRouter`, so the route lives in `location.hash`; the write throws the hash away and leaves the address bar at `/?scroll=N`. The router's in-memory location survives (no popstate fires), so the damage only shows up on the next reload/restart — the app opens at `/` instead of the screen the cashier was on, losing `?day=`, `?tab=`, `?selected=` and `?draft=`. The restore half of the same hook reads `window.location.search`, which is always empty under a hash router, so the feature it exists for has never worked either.

## Details

## Evidence

`src/route.tsx:1` — the app is a hash router:

```ts
import { createHashRouter } from "react-router";
```

`src/components/ui/table.tsx:26-33` — every `Table` mounts the hook and wires it to the scroll container, so this is not an opt-in on one page:

```tsx
const Table = React.forwardRef<...>(({ className, parentClass, ...props }, ref) => {
  const [parentRef, handleScroll] = useScroll();
  return (
    <div ref={parentRef} onScroll={handleScroll} className={cn("relative w-full overflow-y-auto max-h-full h-auto", parentClass)}>
```

`src/hooks/use-scroll.ts:26-36` — the write:

```ts
const scrollTop = ref.current.scrollTop;
const params = new URLSearchParams(window.location.search);
const parsed = numeric.safeParse(params.get("scroll"));
const currentScroll = parsed.success ? parsed.data : 0;
// Only update if scroll position changed significantly
if (Math.abs(currentScroll - scrollTop) > 10) {
  params.set("scroll", scrollTop.toString());
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
}
```

`window.location.pathname` for this app is `/` (dev) or `/index.html` (packaged) and the route is in the hash, so the statement above replaces `tauri://localhost/index.html#/records?selected=r1` with `/?scroll=137`. The hook's own restore path (line 12: `new URLSearchParams(window.location.search)`) reads the same empty `search`, so the scroll it saved is never restored.

`Table` is imported by nine screens (`src/pages/Record/z-Record/List.tsx:10`, `src/pages/Record/Search/z-Search.tsx:16`, `src/pages/Debt/z-DebtTable.tsx:12`, `src/pages/Product/z-ProductTable.tsx:10`, `src/pages/Money/History/z-TableList.tsx:8`, `src/pages/Record/page.tsx:12`, `src/pages/Extra/page.tsx:3`, plus the detail/extras tables), and `src/pages/Extra/z-Layout.tsx:4` mounts `useScroll` directly. So the trigger is "scroll any list", the most common interaction on the Records and Debt screens.

Everywhere else in the repo the URL is written through React Router and is therefore hash-aware, which is what makes this one the outlier:

- `src/pages/cart/use-draft.ts` — `setSearch(..., { replace: true })`
- `src/pages/Record/use-selected.ts` — same
- `src/pages/Record/use-order.ts`, `src/pages/cart/use-stage.ts` — same

There is no test that touches `useScroll` or `Table` (`rg -l "Calendar|DateRange|useScroll" src --glob "*.test.*"` returns nothing), which is why this survived nine iterations.

## Why it matters

The POS keeps most of its navigation state in the URL on purpose (`use-draft.ts` and `use-selected.ts` document it): a refresh, a dev reload, a webview crash-restart or a Windows shutdown-and-reopen is supposed to land the cashier back on the same cart / record / day. After one scroll of a table, the address bar no longer contains the route, so the next start lands on the default route instead. On the Records screen that means the selected record and the chosen day are gone; on the POS the open cart is gone (the draft is still on disk, so nothing is lost permanently — but the operator has to find it again). The scrolled table also silently rewrites history entries, and the scroll-restore feature is dead code that gives the reader of `use-scroll.ts` a false impression that position is preserved.

## Recommended fix

Delete the URL plumbing from `useScroll` and keep the scroll position in memory, or make it hash-aware. Concretely, pick one:

1. **Simplest and honest:** drop the URL sync entirely. The app already re-mounts `Table` on route/data change, so the only thing the URL bought was "restore the table offset after a reload", which has never worked. `useScroll` becomes `useRef` + nothing, or is deleted with `onScroll` removed from `Table`.
2. **If scroll restoration is actually wanted:** store it in `sessionStorage` keyed by `location.hash + location.search` (no history mutation), or write through React Router (`useSearchParams` with `{ replace: true }`) so the hash is preserved:
   ```ts
   const [search, setSearch] = useSearchParams();
   // inside the scroll handler, throttled:
   setSearch((old) => new URLSearchParams({ ...old, scroll: String(scrollTop) }), { replace: true });
   ```
   and read it back with `search.get("scroll")`, not `window.location.search`.

Whichever is chosen, `Table` must not mutate the URL as a side effect of scrolling: a presentational primitive should never have navigation side effects.

## Acceptance criteria

- Scrolling any `Table` (Records list, record search, Debt, Product, Money history, Extra) leaves `window.location.href` byte-identical, including the `#/…` fragment and its query string.
- No `window.history.*` call remains outside React Router (or, for option 2, no `window.history.replaceState` with a hand-built URL string).
- If scroll restoration is kept, a test proves the position survives a remount and that the route hash is unchanged.
- `useScroll` no longer reads `window.location.search`.

## Verification

1. `rg -n "history\.(replace|push)State" src` returns no hit that builds a URL from `window.location.pathname`.
2. Manual: open `/records`, pick a day and a row, scroll the list, reload (Ctrl+R). The same day and row are still selected and the fragment still reads `#/records?day=…&selected=…`.
3. Add `src/hooks/use-scroll.test.ts(x)`: render a scrollable `Table` in happy-dom, set `scrollTop`, dispatch `scroll`, assert `window.location.hash` is untouched.
