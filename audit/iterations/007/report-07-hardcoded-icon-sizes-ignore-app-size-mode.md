---
slug: hardcoded-icon-sizes-ignore-app-size-mode
title: "Fifteen lucide icons hardcode `size={N}` and so ignore the app's Besar/Kecil mode, with no test enforcing the `icon` utility"
severity: low
category: ux
iteration: 7
created: 2026-10-21T20:43:49.828Z
files:
  - "src/pages/Record/z-Header/index.tsx"
  - "src/pages/Record/z-Header/SearchBars.tsx"
  - "src/pages/Record/z-Header/FilterDialog.tsx"
  - "src/pages/Record/z-Header/z-FilterGroup.tsx"
  - "src/components/Loading.tsx"
  - "src/components/NotFound.tsx"
  - "src/components/FileDropZone.tsx"
  - "src/components/ui/pagination.tsx"
  - "src/lib/design-tokens.test.ts"
---

# Fifteen lucide icons hardcode `size={N}` and so ignore the app's Besar/Kecil mode, with no test enforcing the `icon` utility

- **Severity:** low
- **Category:** ux
- **Files:** `src/pages/Record/z-Header/index.tsx`, `src/pages/Record/z-Header/SearchBars.tsx`, `src/pages/Record/z-Header/FilterDialog.tsx`, `src/pages/Record/z-Header/z-FilterGroup.tsx`, `src/components/Loading.tsx`, `src/components/NotFound.tsx`, `src/components/FileDropZone.tsx`, `src/components/ui/pagination.tsx`, `src/lib/design-tokens.test.ts`
- **Iteration:** 7

## Summary

Recurring (in iteration 5's and 6's verdicts, never filed): `className="icon"` is the scaling convention (30px → 20px when the app switches to Kecil) and is used 75 times, but 15 call sites still pass a numeric `size={14|16|18|20|22|30|64|100}` to lucide, which writes width/height attributes that no `.small` rule can override. The worst of them are the Records day steppers and the search magnifier — the most-clicked controls on that screen — plus the shared `Loading` and empty states. No test enforces the convention, unlike text sizes.

## Details

## Evidence

`src/global.css:367-370` defines the project's one icon-size utility, and
`:174` / `:245` set it per app size:

```css
@utility icon {
  width: var(--icon-size);
  height: var(--icon-size);
}
/* big */   --icon-size: 30px;
/* small */ --icon-size: 20px;
```

`className="icon"` is used 75 times in `src`. Fifteen call sites still hardcode a
lucide `size={N}`, which writes `width`/`height` **attributes** — nothing in
`.small` can override them, so those icons stay the same pixel size in Kecil mode
while every other icon shrinks by a third:

| file | line | icon |
|---|---|---|
| `src/pages/Record/z-Header/index.tsx` | 45 | `FolderSearch size={16}` (the search-page button) |
| `src/pages/Record/z-Header/index.tsx` | 57, 72 | `ChevronLeft/Right size={14}` (previous/next day) |
| `src/pages/Record/z-Header/SearchBars.tsx` | 25 | `SearchIcon size={16}` |
| `src/pages/Record/z-Header/FilterDialog.tsx` | 54, 72 | `SlidersHorizontal size={16}`, `X size={18}` |
| `src/pages/Record/z-Header/z-FilterGroup.tsx` | 93 | `Icon size={20}` |
| `src/pages/Debt/z-Summary.tsx` | 12 | `HandCoins size={22}` |
| `src/components/NotFound.tsx` | 15, 33, 42 | `TriangleAlert size={64}`, `MoveLeft/Home size={18}` |
| `src/components/ui/pagination.tsx` | 60, 72 | `ChevronLeft/Right size={30}` |
| `src/components/Loading.tsx` | 13, 20 | `Loader2 size={100}` |
| `src/components/FileDropZone.tsx` | 60 | `<Cloud className="w-8 h-8" />` (a class, but not `icon`) |

Related, same file family: `src/pages/Record/Search/z-Search.tsx:149` and `:195`
stripe rows with `bg-blue-50/50` — a literal Tailwind palette colour rather than
`bg-muted/50`, which is the only place in `src/pages` that leaves the theme
palette.

## Why it matters

The size mode is not cosmetic: it exists so the same app is usable on a small POS
terminal, and the whole typography system (`text-normal` / `text-big` /
`text-small`, all re-resolved per mode) plus `small:h-*` on every row is built for
it. A 14 px chevron and a 16 px magnifier that refuse to shrink sit inside
controls that *did* shrink (`Record/z-Header` uses `size="icon"` buttons whose
padding is unchanged), so in Kecil mode the record header becomes an
icon-heavy 44 px bar with oversized glyphs — and the day steppers are the two
most-clicked controls on the Records screen.

It is also the pattern an agent has to keep re-learning: two conventions
(`className="icon"` vs `size={N}`) with no test enforcing either, which is how
fifteen call sites drifted.

## Recommended fix

Replace `size={N}` with `className="icon"` everywhere, adding a per-case size
class only where the design really is not the shared icon size
(e.g. the empty-state `TriangleAlert`, the 100 px spinner):

```tsx
<ChevronLeft className="icon" />
<Loader2 className="size-16 animate-spin" />   // deliberately larger than .icon
<Cloud className="icon" />                     // FileDropZone
```

Then extend `src/lib/design-tokens.test.ts` (which already scans for fixed text
sizes) with the same treatment for icons: fail on `size={` followed by a digit
inside a `lucide-react` element, with an explicit allow-list for the handful of
intentionally-larger ones.

## Acceptance criteria

- `rg 'size=\{[0-9]' src` returns nothing except an allow-listed set recorded in
  the test.
- `design-tokens.test.ts` fails when a new `lucide` icon ships a numeric `size`.
- In Kecil mode, the Records header chevrons, the search magnifier and the filter
  icon are visibly smaller than in Besar, matching every other icon on the screen.
- The zebra stripes use a theme colour (`bg-muted/50`).

## Verification

`bun test src/lib/design-tokens.test.ts`. Manual: toggle Besar → Kecil in
Pengaturan and compare `#/records` and the empty states; check the record header
buttons still fit their 44 px rows.
