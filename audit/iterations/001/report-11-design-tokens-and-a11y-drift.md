---
slug: design-tokens-and-a11y-drift
title: "Hard-coded text sizes, unnamed icon buttons, and an Alt handler that cancels every Alt key"
severity: medium
category: ux
iteration: 1
created: 2026-10-21T17:32:19.304Z
files:
  - "src/layouts/authenticated/z-Topbar.tsx"
  - "src/layouts/authenticated/z-TopNavList.tsx"
  - "src/layouts/authenticated/use-navigation-shortcuts.ts"
  - "src/layouts/authenticated/use-shortcut.ts"
  - "src/layouts/authenticated/z-Refresh.tsx"
  - "src/components/ErrorBoundary.tsx"
  - "src/components/ErrorComponent.tsx"
  - "src/components/NotFound.tsx"
  - "src/pages/Pos/Draft/z-ListingCard.tsx"
  - "src/components/ui/button.tsx"
---

# Hard-coded text sizes, unnamed icon buttons, and an Alt handler that cancels every Alt key

- **Severity:** medium
- **Category:** ux
- **Files:** `src/layouts/authenticated/z-Topbar.tsx`, `src/layouts/authenticated/z-TopNavList.tsx`, `src/layouts/authenticated/use-navigation-shortcuts.ts`, `src/layouts/authenticated/use-shortcut.ts`, `src/layouts/authenticated/z-Refresh.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/ErrorComponent.tsx`, `src/components/NotFound.tsx`, `src/pages/Pos/Draft/z-ListingCard.tsx`, `src/components/ui/button.tsx`
- **Iteration:** 1

## Summary

Shared chrome and error surfaces hard-code `text-3xl`/`text-2xl`/`text-xl`/`text-[10px]` instead of `text-normal`/`text-big`, so the app's own Besar/Kecil size mode only half-works and the error screen renders 10px text. Icon-only buttons (Back, Refresh, delete row) have no accessible name, and the global Alt handler calls `preventDefault()` on every Alt keydown before checking for a match, cancelling normal Alt typing and native Alt+Left.

## Details

## Evidence

### Hard-coded text sizes instead of the two required tokens

`.agent/agent.md` and `.pi/skills/services.md` require `text-normal` / `text-big` and forbid fixed sizes because `body.small` (`src/layouts/root.tsx` → `applySize`) re-resolves the tokens. These bypass it:

```
src/layouts/authenticated/z-Topbar.tsx:54        "text-3xl small:text-2xl"
src/layouts/authenticated/z-TopNavList.tsx:32   "text-3xl small:text-2xl"
src/components/NotFound.tsx:20                  "text-2xl font-bold tracking-tight sm:text-3xl"
src/components/ErrorComponent.tsx:18            "text-2xl font-semibold"
src/components/ErrorBoundary.tsx:94             "font-mono text-xl"
src/components/ErrorBoundary.tsx:98             "text-lg leading-relaxed"
src/components/ErrorBoundary.tsx:127            "text-[10px] font-bold uppercase tracking-widest text-foreground/50"
src/pages/Analytics/Crowd/z-Crowd.tsx:28,43     "text-2xl"
src/pages/Login/z-BrandPanel.tsx:29,36          "text-xl", "text-lg … small:text-base"
src/pages/Login/z-LoginForm.tsx:72              "text-xl … small:text-lg"
components/ui/button.tsx:21 (sm), input.tsx:11 (file:text-sm), table.tsx:123, field.tsx:34/131/144/166, breadcrumb.tsx:21
```

`text-[10px]` is below the project's own minimum readable size and appears on the *error* screen, i.e. the one place a shopkeeper has to read carefully. Every one of these is 1.5–3× the surrounding `text-normal` (30px in big mode) in a different scale, so the app has two competing typographic systems that drift whenever `small` is toggled.

### Icon-only controls without accessible names

`Button size="icon"` with only a Lucide child and no `aria-label`:

```
src/layouts/authenticated/z-Topbar.tsx:47   <ArrowLeft />  (back)
src/layouts/authenticated/z-Refresh.tsx:9-13 <RefreshCcw /> (full page reload)
src/pages/Pos/Draft/z-ListingCard.tsx:112   title="Hapus baris" (title only, not a name)
```

Across ~120 `.tsx` files there are only 20 files using `aria-label` at all (`rg -c aria-label src --glob '*.tsx'`), and none of the POS cart's icon affordances expose a programmatic name. Radix dialogs/popovers inherit sensible focus behaviour, but the icon buttons do not.

### Global Alt handler swallows every Alt press

```ts
// src/layouts/authenticated/use-navigation-shortcuts.ts
function handleKey(e: KeyboardEvent) {
  if (!e.altKey) return;
  e.preventDefault();                     // 1. every Alt keydown is cancelled
  const link = linkMap[e.key] as string | undefined;
  if (link === undefined) return;         // 2. …even when no shortcut matched
  …
}
function handleAltUp(e: KeyboardEvent) {
  if (!e.altKey) { e.preventDefault(); press = false; }   // 3. and on release
}
```

There is no target check: `Alt` while typing in the POS search field, `Alt+Left/Right` (native back/forward), `Alt+Enter`, and AltGr character input are all cancelled. The shortcut legend is toggled by a 5 s timer (`use-shortcut.ts`), with module-level mutable state (`let press = false`) shared across mounts.

## Why it matters

- The size mode is a first-class feature (Setting → Toko → `z-SelectSize.tsx`); hard-coded sizes make it half-work, which is worse than not having it.
- A POS is operated at arm's length by someone standing; 10px error text and mixed heading scales are legibility failures, not style nits.
- Keyboard-first is this app's biggest strength (F1/F2/F12, Ctrl+arrows, arrow-grid). Globally cancelling Alt undermines it: an operator pressing Alt to peek at the shortcut legend in a text field may lose a keystroke, and screen-reader / OS-level Alt behaviours are suppressed.
- Icon buttons without names are unusable with a screen reader and undiscoverable with a trackpad.

## Recommended fix

1. Replace the hard-coded sizes with the token scale: `text-3xl` → `text-big` (or `text-normal` + `font-bold`), `text-2xl`/`text-xl`/`text-lg` → `text-normal` with weight for hierarchy, and `text-[10px]` → `text-small` (the documented minimum). Where `small:` is genuinely needed, use `small:` with a *token*, e.g. `text-big small:text-normal`.
2. For the shadcn primitives (`button.tsx` `sm: text-xs`, `input.tsx` `file:text-sm`, `table.tsx` caption, `field.tsx`), align with `text-small`/`text-normal` so the primitives stop re-introducing fixed px.
3. Add `aria-label` to every `Button size="icon"` (Back, Refresh → "Muat ulang aplikasi", delete row → "Hapus baris"), and keep `title` as the tooltip.
4. Rework the Alt handler: only `preventDefault` when `linkMap[e.key]` resolves, ignore events whose target is an editable element, and listen on `window` rather than `body` so the same code works for the splash/login screens. Move the `press` flag into a `useRef` inside the hook.

## Acceptance criteria

- `rg -n "text-(xs|sm|base|lg|xl|[0-9]xl|\[[0-9]+px\])" src --glob '!src/global.css'` returns only deliberate, justified exceptions (ideally none outside `components/ui` shadcn internals).
- Toggling Setting → Ukuran between Besar/Kecil changes every heading, error screen and dialog proportionally, with no element staying at a fixed size.
- Every icon-only button has an accessible name (`expect(screen.getByRole("button", { name: /hapus baris/i }))`).
- `Alt` alone does not cancel typing; `Alt+1`…`Alt+6` still navigate; `Alt+Left` in a text field behaves natively.

## Verification

- Keyboard-only walkthrough of `/pos`, `/products`, `/setting`: Tab to every control, confirm focus ring + name announced (NVDA/Narrator or Playwright `getByRole`).
- Playwright: `await page.keyboard.press("Alt+1")` navigates to `/pos`; type "a" in the search field with Alt held and assert the character appears.
- Set size to Kecil and screenshot the error screen and Topbar; compare against the token table in `.pi/skills/services.md`.
