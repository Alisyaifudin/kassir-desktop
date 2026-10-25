---
slug: cart-stream-errors-swallowed-beside-loader
title: "Service failures are swallowed in three cart components: an endless spinner for the settle strip, a silently missing customer/supplier field"
severity: medium
category: correctness
iteration: 7
created: 2026-10-21T20:42:39.291Z
files:
  - "src/pages/Pos/z-Bottom.tsx"
  - "src/pages/Pos/Draft/z-Customer.tsx"
  - "src/pages/Restock/Draft/z-Supplier.tsx"
  - "src/components/Loader.tsx"
  - "src/pages/Restock/Draft/z-Payment.tsx"
---

# Service failures are swallowed in three cart components: an endless spinner for the settle strip, a silently missing customer/supplier field

- **Severity:** medium
- **Category:** correctness
- **Files:** `src/pages/Pos/z-Bottom.tsx`, `src/pages/Pos/Draft/z-Customer.tsx`, `src/pages/Restock/Draft/z-Supplier.tsx`, `src/components/Loader.tsx`, `src/pages/Restock/Draft/z-Payment.tsx`
- **Iteration:** 7

## Summary

Three components read a service stream by hand instead of through `<Loader>`, so a failed read is indistinguishable from a pending one: `Pos/z-Bottom.tsx` renders `<Loading />` forever when the method catalogue fails (the sale can never be paid, with no message), and `z-Customer.tsx` / `z-Supplier.tsx` return `null`, so the customer/supplier field silently disappears and the sale is committed without it. `Restock/Draft/z-Payment.tsx` does the same read correctly via `<LoaderMany>` one file away.

## Details

## Evidence

`useStream` returns `{ type: "error", error }` on failure
(`src/components/Loader.tsx:196-218`). Four components read that `Result` by hand
instead of handing it to `<Loader>` — and three of them treat "not success" and
"error" as the same thing:

```tsx
// src/pages/Pos/z-Bottom.tsx:139-141  — the settle strip both screens share
const res = useStream(service.method.get.catalogChanges);
if (res.type !== "success") return <Loading />;
```

```tsx
// src/pages/Pos/Draft/z-Customer.tsx:15-17
const res = useStream(service.customer.get.changes);
if (res.type !== "success") return null;
```

```tsx
// src/pages/Restock/Draft/z-Supplier.tsx:13-15
const res = useStream(service.supplier.get.changes);
if (res.type !== "success") return null;
```

(The fourth, `src/components/cart/z-Listing.tsx:397`, is a genuine
"not loaded yet" guard inside `pickFirst` and is fine.)

The two service errors are real, not hypothetical: `MethodError`,
`CustomerError` and `SupplierError` are produced by
`dbErrorTo…` from any `DatabaseService` failure — the same class of failure the
rest of the app routes to an error boundary (`RecordsErrorBoundary`,
`Loader`'s `throw res.error`, `settings.md §2-3` in `.pi/skills/services.md`:
"Prefer `<Loader>`/`<LoaderMany>` over manual `if (res.type === …)` guards").

`.pi/skills/services.md` states the rule explicitly under "Component rules":
"A leaf that needs data calls `useStream(service.x.changes)` itself … Prefer
`<Loader>` / `<LoaderMany>` over manual `if (res.type === …)` guards."

## Why it matters

Three different silent degradations, all on the money path:

1. **The settle strip hangs forever.** `PayStrip` renders `<Loading />` for both
   `init` and `error`. If the method catalogue fails to read, the cashier gets a
   spinner where the payment methods should be — with no message, no retry, and
   no way to take money — on a screen where the goods and the total still render,
   so it reads as "the app is thinking" rather than "this is broken".
2. **The customer/supplier field vanishes.** `<Customer>`/`<Supplier>` return
   `null`, so the field is simply gone from the sale panel. The operator rings up
   the sale, and the customer/supplier is silently not recorded. Nothing in the
   UI or the log says the field is missing; on Restock the panel even renders the
   accordion label "Pemasok: —", which reads as "no supplier chosen".
3. A screen reader / keyboard user gets no signal at all: the payment grid is
   gone (replaced by a spinner with no `role="status"`), the customer combobox is
   gone (no announcement).

Restock already does this correctly one component away: `Restock/Draft/z-Payment.tsx`
wraps the same `method.get.catalogChanges` in `<LoaderMany>` and therefore throws
into a boundary. The two shapes coexist in the same feature.

## Recommended fix

Route them through the existing primitives rather than inventing per-component
handling:

- `Pos/z-Bottom.tsx` `PayStrip`: fetch the same way `Restock/Draft/z-Payment.tsx`
  does, or at minimum `<Loader res={res} fallback={<Loading />}>` which throws
  `MethodError` into the nearest boundary. Wrap the strip in
  `createErrorBoundary(MethodError)` if the whole POS should not go down for it —
  but it must say something, and it must offer reload.
- `Pos/Draft/z-Customer.tsx` and `Restock/Draft/z-Supplier.tsx`: same, via
  `<Loader>`, or return a disabled field with an inline message ("Daftar
  pelanggan gagal dimuat — transaksi bisa disimpan tanpa pelanggan"). Silently
  `return null` is the one option that must not survive.

## Acceptance criteria

- A failing `method.get.catalogChanges` shows a message (and a retry or a
  boundary), not an endless spinner, on both `/pos` and `/restock`.
- A failing `customer.get.changes` / `supplier.get.changes` is visible on the
  screen; the field is either replaced by an explicit error or disabled with an
  inline message — never silently absent.
- No `if (res.type !== "success") return <Loading/>` or `return null` remains in
  `src/pages` / `src/components`.

## Verification

`bun test` (the existing `z-Discount.test.tsx` / `z-Extras.test.tsx` harness
shows the pattern: stub at the service boundary, not the internals). Add one
render test per component that makes `useStream` resolve to `error` and asserts a
visible message. `rg 'type !== "success"' src` should return only the
`pickFirst` guard in `z-Listing.tsx`.
