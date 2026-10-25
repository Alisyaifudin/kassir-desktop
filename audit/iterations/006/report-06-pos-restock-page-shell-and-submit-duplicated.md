---
slug: pos-restock-page-shell-and-submit-duplicated
title: "Pos and Restock still carry two copies of the page shell and two shapes of the submit path"
severity: medium
category: architecture
iteration: 6
created: 2026-10-21T20:21:22.269Z
files:
  - "src/pages/Pos/page.tsx"
  - "src/pages/Restock/page.tsx"
  - "src/pages/Pos/Draft/index.tsx"
  - "src/pages/Restock/Draft/index.tsx"
  - "src/components/cart/use-cart-screen.ts"
---

# Pos and Restock still carry two copies of the page shell and two shapes of the submit path

- **Severity:** medium
- **Category:** architecture
- **Files:** `src/pages/Pos/page.tsx`, `src/pages/Restock/page.tsx`, `src/pages/Pos/Draft/index.tsx`, `src/pages/Restock/Draft/index.tsx`, `src/components/cart/use-cart-screen.ts`
- **Iteration:** 6

## Summary

The cart hook extraction landed, but the two page shells are still the same file twice — identical `Page` wrapper, identical `active === null` branch, `completeDialog`, `inert`/overlay block and totals derivation — and the commit path now exists in two shapes (`submitDraft` returning boolean vs `runSubmit` returning a message). Sixth audit in a row on this root cause; what remains is the part that decides what "Bayar" means.

## Details

## Evidence

Iteration 5 correctly extracted the *stateful* half of these two screens into
`src/components/cart/use-cart-screen.ts` (328 lines) and merged `z-Complete`. What is left
in the two page files is still the same page written twice, and the duplicated halves are
the ones that decide what a submit means.

The wrapper is identical in both files, down to the class string:

```tsx
// src/pages/Pos/page.tsx:39-60  and  src/pages/Restock/page.tsx:44-65
export default function Page() {
  const [stage, setStage] = useStage(STAGES);
  const [draftId, setDraftId] = useDraftId();
  const res = useStream(service.transaction.get.changes);
  return (
    <main className="relative flex h-full min-h-0 shrink grow basis-0 flex-col overflow-hidden">
      <Loader res={res} fallback={<Loading />}>
        {({ data }) => (
          <Screen drafts={data} stage={stage} onStage={setStage} draftId={draftId} onDraft={setDraftId} />
        )}
      </Loader>
    </main>
  );
}
```

The same holds for the rest of the `Screen` body:

- the `active === null` branch rendering `CartStartError`/`Loading` plus `completeDialog()`
  (`Pos/page.tsx:104-115` ≈ `Restock/page.tsx:129-140`);
- `completeDialog()` itself, including the "same child position so React does not remount
  the dialog" comment (`Pos/page.tsx:126-151` ≈ `Restock/page.tsx:186-211`);
- the `inert={submitting}` wrapper with `<SaveError />` and the `bg-background/60` overlay
  (`Pos/page.tsx:159-198` ≈ `Restock/page.tsx:204-243`);
- the grand-total/change derivation (`roundMoney(transactionGrandTotal(purchaseTotal(...),
  active.rounding), active.fix)`), verbatim.

The two submit paths have already drifted in shape for the same job — Pos returns a
boolean and sets `complete` from a `void ... .then` (`Pos/page.tsx:132-158`), Restock
returns the failure message to the credit dialog from an `async` function
(`Restock/page.tsx:150-183`) — and the "title from the first listing" effect is duplicated
verbatim, comment and all:

```tsx
// src/pages/Pos/Draft/index.tsx:59-66
// The open sale takes its name from its first listing.
{ const title = lines.find((line) => line.name.trim() !== "")?.name.trim() ?? "Transaksi Baru";
  if (title !== draft.title) run(service.transaction.set.title(draft.id, title)); }

// src/pages/Restock/Draft/index.tsx:67-74  — byte-identical, comment says "purchase"
```

This is the sixth consecutive audit reporting this root cause (iteration 1 through 5 filed
variants of it), now reduced to the page shell and the submit/complete block.

## Why it matters

The remaining duplication is not cosmetic: it is the commit path. Two copies of "blur the
active element, set submitting, run `transaction.submit`, set submitting false, either
toast the error or open `Complete`" means any future rule — a double-submit guard, a
receipt auto-print, an offline-retry, a "sale belongs to the previous cashier" check — has
to be written twice and will be written twice differently, exactly as `submitDraft` vs
`runSubmit` already are. The screen pair is also the pair most likely to be edited together
(a POS rule usually applies to purchases too), so a divergence is one commit away.

The duplicated title effect is the smaller but sharper instance: it is a service write
triggered from a render-adjacent effect in two places, and the Restock copy's comment
already disagrees with the Pos copy.

## Recommended fix

Extract the remaining shell once, keeping the real differences as parameters:

1. `src/components/cart/z-CartPage.tsx` (or `CartShell`): the `<main>` + `<Loader
   res={transaction.get.changes}>` + the `active === null` branch + `CartStartError` +
   `completeDialog()` + the `inert` wrapper and submitting overlay + `<SaveError />`.
   Props: `mode`, `stage`/`onStage`, `draftId`/`onDraft`, the panel children, and the
   `Completed` payload factory.
2. One submit hook, `useSubmitCart({ active, complete, setComplete })`, that owns the
   blur → setSubmitting → `Effect.either(submit)` → toast/`setComplete` sequence and
   returns `{ submitting, submit(extra?: { credit?: boolean }): Promise<string | null>,
   canSubmit }`. Pos ignores the returned message (it toasts); Restock hands it to the
   credit dialog. One rule set, two call sites.
3. Move the title effect into `useCartScreen` (it already has `lines` and `setLines`); the
   sale/purchase difference is only a comment.
4. Keep what genuinely differs — the stage list, the bottom strip, the F1/F2 handlers —
   exactly as `useCartScreen` already does.

## Acceptance criteria

- `Pos/page.tsx` and `Restock/page.tsx` each contain only what differs: their stage list,
  their bottom panel, their F1/F2 handlers, and their `Completed` shape (target ≲ 80 lines
  each, with no duplicated JSX/loader/inert/overlay block).
- One implementation of "blur → submitting → submit → toast-or-complete", parameterised by
  whether a failure message goes back to the caller.
- One implementation of the draft-title effect.
- A render test drives both screens through one submit (success + failure) and asserts
  identical dialog/toast behaviour, so a divergence fails CI.

## Verification

- `rg "transaction.submit" src/pages` → one call site besides tests.
- `rg "takes its name from its first listing" src` → one hit.
- `bun test`, `bun run test:e2e` (the POS sale flow in `e2e/pos-cart.e2e.ts` must stay
  green), `bun run lint`, `bun run typecheck`.
- Manual: Pos and Restock — ring up, F12 to a second tab, park/restore, Bayar, Batalkan,
  and confirm both screens behave the same except for the documented differences.
