---
slug: hardcoded-text-sizes-still-shipping
title: "Fixed text sizes still ship in 10 files, so the small-mode scale breaks the receipt and both destructive dialogs"
severity: low
category: ux
iteration: 3
created: 2026-10-21T18:47:46.346Z
files:
  - "src/pages/Record/Item/z-Receipt/z-Top.tsx"
  - "src/pages/Money/History/z-DeletePocket.tsx"
  - "src/pages/Money/History/z-DeleteRecordBtn.tsx"
  - "src/pages/Money/History/z-SelectType.tsx"
  - "src/components/Notification.tsx"
  - "src/pages/Login/z-BrandPanel.tsx"
  - "src/pages/Login/z-LoginForm.tsx"
  - "src/pages/Setting/Data/RecordDownload.tsx"
  - "src/pages/Setting/Data/RecordUpload/z-Schema.tsx"
  - "src/pages/Product/Detail/Image/z-AddTile.tsx"
---

# Fixed text sizes still ship in 10 files, so the small-mode scale breaks the receipt and both destructive dialogs

- **Severity:** low
- **Category:** ux
- **Files:** `src/pages/Record/Item/z-Receipt/z-Top.tsx`, `src/pages/Money/History/z-DeletePocket.tsx`, `src/pages/Money/History/z-DeleteRecordBtn.tsx`, `src/pages/Money/History/z-SelectType.tsx`, `src/components/Notification.tsx`, `src/pages/Login/z-BrandPanel.tsx`, `src/pages/Login/z-LoginForm.tsx`, `src/pages/Setting/Data/RecordDownload.tsx`, `src/pages/Setting/Data/RecordUpload/z-Schema.tsx`, `src/pages/Product/Detail/Image/z-AddTile.tsx`
- **Iteration:** 3

## Summary

Twelve lines across ten files still bypass the four design tokens — `text-3xl` in both money-history destructive dialogs, `text-3xl`/`text-2xl` in the receipt header, `text-5xl small:text-4xl` in the login brand panel, `text-sm` in the JSON schema dialog — plus four uses of the owner-reserved `text-tiny`. Because the tokens re-resolve under the `small:` mode (30 px → 20 px) while raw sizes do not, these screens have a hierarchy that is only correct in one of the two supported sizes. Recurring for the third audit: iteration 1 fixed the three files it named by hand, this set was left.

## Details

## Evidence

`.pi/skills/services.md` §5 fixes the scale: four tokens (`text-big`, `text-normal`, `text-small`, `text-tiny`), re-resolved per app size, and "**Never use raw `text-xs` / `text-sm` / `text-[Npx]`. They are fixed px and ignore the app size mode entirely, so they break under the `small:` toggle.**" `text-tiny` is reserved for the project owner.

Current violations (all confirmed on HEAD):

| File | Line | Class | What it is |
|---|---|---|---|
| `src/pages/Record/Item/z-Receipt/z-Top.tsx` | 24 | `text-3xl` | receipt header title |
| `src/pages/Record/Item/z-Receipt/z-Top.tsx` | 27, 29 | `text-2xl` | "Kredit" / "Lunas" status |
| `src/pages/Money/History/z-DeletePocket.tsx` | 25, 26 | `text-3xl` | destructive dialog title + body |
| `src/pages/Money/History/z-DeleteRecordBtn.tsx` | 34, 35 | `text-3xl` | destructive dialog title + body |
| `src/pages/Money/History/z-SelectType.tsx` | 18 | `text-3xl` | upload-type select |
| `src/components/Notification.tsx` | 6 | `text-3xl` | app notification panel |
| `src/pages/Login/z-BrandPanel.tsx` | 26 | `text-5xl small:text-4xl` | login brand headline |
| `src/pages/Setting/Data/RecordDownload.tsx` | 14 | `text-2xl` | export form row |
| `src/pages/Setting/Data/RecordUpload/z-Schema.tsx` | 54 | `text-sm` | JSON schema `<pre>` |
| `src/pages/Login/z-BrandPanel.tsx` | 49, 50 | `text-tiny` | footer note, version string |
| `src/pages/Login/z-LoginForm.tsx` | 82 | `text-tiny` | inline hint |
| `src/pages/Product/Detail/Image/z-AddTile.tsx` | 22 | `text-tiny` | "Tambah" label |

Why this is not cosmetic: the tokens are re-resolved when the operator switches size (`src/global.css`, `--text-normal` 30px → 20px, `--text-big` 48px → 36px), and `ApplySize` in `src/layouts/root.tsx` toggles `.small` on `<body>` before paint. A `text-3xl` is a fixed 30 px in both modes, so on a small-mode terminal the money-history delete confirmation and the receipt header stay at 30 px while everything around them drops to 20 px — they become the largest text on the screen instead of matching it. `text-5xl`/`text-4xl` in the login panel likewise bypass the token pair entirely (the `small:` override is a hand-rolled second scale).

This is a recurring finding from the previous two audits: iteration 1 fixed the three files it named (`z-Topbar`, `z-TopNavList`, `ErrorBoundary`), iteration 2 noted "8 files still carry fixed text sizes" without a report, and none of them were fixed. The set is now 8 files plus four uses of the reserved `text-tiny` escape hatch.

## Why it matters

The size toggle is a first-class feature of this app — it exists because shop PCs sit at different distances and some operators are older. Any screen that ignores it has a layout that is only correct in one of the two modes, and the affected screens are not decorative: the receipt preview, the two destructive confirmations (delete pocket, delete money record) and the schema dialog are all read under time pressure. A cashier in small mode reading "Hapus Catatan" at 30 px with a 20 px body is being shown the wrong visual hierarchy, and the destructive dialogs in particular should be the *clearest* text on the screen, not the least predictable.

It is also the cheapest possible convention debt to retire: 12 lines, no design decisions, and it removes an audit signal that will otherwise be filed again next iteration.

## Recommended fix

Map each case onto the four tokens and let `small:` do the scaling:

* `text-3xl` → `text-big` (dialog titles, notification heading); `text-2xl` → `text-normal` or `text-big` depending on the role — for the receipt's "Kredit"/"Lunas" status use `text-normal` and keep the colour (`text-red-500` / `text-emerald-500`) as the differentiator.
* `text-5xl small:text-4xl` in `z-BrandPanel` → `text-big` (it is the login headline, which the token set already sizes for the screen).
* `text-sm` in `z-Schema` → `text-small` (a monospace `<pre>` still reads at 24/18 px).
* `text-tiny` → `text-small` in `z-LoginForm` and `z-AddTile`. The `z-BrandPanel` footer and the version string are the only two places where the escape hatch is arguably intended (they are metadata, not content) — confirm with the owner or switch them to `text-small` too so `rg text-tiny src` is empty.
* While in these files, check the surrounding `<h2>`/`<h3>`: Tailwind preflight zeroes heading sizes, so any heading without a token class renders at 16 px (this is the trap the skill warns about, and `z-Receipt/z-Top.tsx` mixes `<h2 className="text-3xl">` with `<p className="text-2xl">`).

## Acceptance criteria

- `rg 'text-(xs|sm|base|lg|xl|[2-9]xl|\[[0-9]+px\])' src --glob '*.tsx'` returns nothing.
- `rg 'text-tiny' src` returns nothing (or only the two documented owner-approved strings).
- In small mode the receipt header, both money-history destructive dialogs and the schema dialog read at the same scale as their surrounding body copy, verified visually on a 800×600 window.
- No heading in the touched files renders at the 16 px preflight size.

## Verification

- Grep guards above run in CI (add to the `Lint` step or a tiny `bun test` that scans `src/**/*.tsx` for the forbidden pattern — the repo already ships pattern tests like `pages/Record/method-filter.test.ts`, so a source-scanning test is in keeping).
- Manual: Settings → Tampilan → size `small`, then open Money → History → delete a record, and Record → a credit record → Struk, and compare against `big`.
- Screenshot both sizes for the receipt and one destructive dialog; the hierarchy should be identical, only the scale should change.
