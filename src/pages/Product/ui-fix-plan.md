# Product UI Fix Plan

> Status: **implemented & verified.** See the verification block at the bottom.
> Scope: full sweep of `src/pages/Product/**` — text scale, sizing, icons,
> component consistency, dead code.
> Out of scope: shared primitives (`ui/button`, `ui/input`, `ui/label`) get
> **no** edits; Product overrides them per-call with `className`.

### Decisions locked

| # | decision |
|---|---|
| 1 | **Full sweep** — all phases including dead-code removal and component swaps. |
| 2 | **Target scale** — content `normal`, chrome/dense `small`, annotation `tiny`. No raw `text-xs`/`text-[Npx]` survivors. |
| 3 | **Phase D** — adopt the `icon` utility (30px / 20px) for the 22 action icons. `--icon-size` untouched. |
| 4 | **Phase A.2** — remove the attention filter outright (capability deleted, not folded into `Filter`). |
| 5 | **Phase K** — include the `isLoss` / `listing.unit` correctness fix; it needs its own verification. |
| 6 | Grid card text at `text-small` (agrees with the table). Section description at `text-tiny`. |
| 7 | `ConfirmDialog` stays **inside** `Product/` as `z-ConfirmDelete.tsx` — no new shared file. |

---

## 0. Ground truth

### Type scale (`src/global.css`)

`.small` is toggled on `<body>`; `@custom-variant small (&:is(.small *))`.

| token | class | `big` (default) | `small` |
|---|---|---|---|
| `--text-big` | `text-big` | 48px / 48 | 36px / 40 |
| `--text-normal` | `text-normal` | **30px / 36** | 20px / 28 |
| `--text-small` | `text-small` | 24px / 32 | 18px / 28 |
| `--text-tiny` | `text-tiny` | 14px / 20 | 12px / 16 |
| `--icon-size` | `icon` | 30px | 20px |

`global.css:361` force-applies `text-normal` to `p, textarea, button, a, label,
select, input, span`. Tailwind preflight zeroes `h1..h6` (`font-size: inherit`);
an `<h2>` with no text class renders at **16px**.

Current distribution in `Product/`: `text-normal` ×41, `text-big` ×2,
`text-small` ×1 (in dead code), `text-tiny` ×0, raw `text-xs` ×13.

### Target scale (per your decision)

| tier | class | used for |
|---|---|---|
| page title | `text-big` | the list `h1` |
| content | `text-normal` | `ui/Input`/`ui/Textarea` values, Detail read-only note, sticky-bar primary CTA |
| chrome / dense / annotation | `text-small` | section `h2`, table cells, grid card text, toolbar count, buttons & toggles, summary values, chart titles, empty-state copy, form field labels, badges, chips, hints, errors, meta lines, timestamps, Detail row labels, chart axis ticks |

**Decision rule:** content → `normal`; everything below it → `small`. Nothing in
this page keeps a raw `text-xs`/`text-[Npx]`.

> **`text-tiny` is withdrawn as of Phase O** — it is reserved as a manual escape
> hatch for the project owner. `text-small` is the smallest size an agent may
> apply. The effective agent-facing scale is therefore **three tiers**, not four.

### Target control sizes

`ui/Input` is 54px via `input{height:54px}` / `small:40px`. `ui/Button` default
is `h-fit px-4 py-2` (≈52px at `text-normal`); `size="icon"` is `h-9 w-9` (36px)
and `size="sm"` is `h-8 px-3 **text-xs**` — the only 5 uses of `size="sm"`
repo-wide are all in `Product/`, so this page is where `ui/button`'s hardcoded
`text-xs` leaks out.

| role | rule |
|---|---|
| toolbar control (input / select / labeled button / icon button / toggle group) | `h-[54px] small:h-10`, `text-small`; icon button `size-[54px] small:size-10` |
| form control | leave `ui/Input` default (54/40) |
| form row / inline control (add button, row delete) | `h-11 small:h-9`; icon button `size-11 small:size-9` |
| footer control (page size, prev/next) | `h-11 small:h-9`; icon button `size-11 small:size-9` |

`size="sm"` and bare `size="icon"` are **banned** in `Product/` from here on —
they pin heights that ignore the app size mode.

### Target icon sizes

The canonical utility is `icon` (30px/20px, used 90× repo-wide; Product uses it
0×). Product currently mixes `size-3/4/5/6/8/10/12`.

| context | rule |
|---|---|
| inside any button / link action | `icon` |
| inline with text inside a badge or label | `size-4 small:size-3` |
| field adornment (search glyph) | `size-6 small:size-5` |
| illustration / placeholder (empty state, card placeholder) | `size-12 small:size-8` / `size-10 small:size-8` |
| inside a third-party primitive (`ui/select`, `ui/checkbox`, `ui/table`) | untouched |

> ⚠️ **Most visible change in this plan.** `size-4` (16px) → `icon` (30px in
> `big`, 20px in `small`) on 22 action icons. **Decided: adopting this** — it is
> what makes Product match `Customer/z-DeleteBtn`,
> `Analytics/Product/z-ProductRow`, `DateRange`, `Calendar`. `--icon-size` is
> left alone.

---

## Phase A — delete dead files

Verified zero importers:

| file | note |
|---|---|
| `z-TableHeader.tsx` | a **second**, divergent table header (No/Kode/Nama/Harga/Modal/Stok with sort buttons); live table has no sorting at all |
| `z-Attention.tsx` | an earlier `Perhatian` checkbox, rendered by the since-deleted `z-ProductPanel`; the whole concept is removed in Phase A.2 |
| `z-Limit.tsx` | superseded by `z-Pagination`; also the only `bg-white` and the only `text-small` in the page |
| `z-LoadingTable.tsx` | superseded by `z-Loading` |
| `z-Layout.tsx` | wraps `useScroll`; unused |
| `use-length.ts` | `@xstate/store` atom, unused |
| `use-attention.ts` | superseded by `use-list-state` |
| `use-limit.ts` | superseded by `use-list-state.size` |
| `use-sort-by.ts` | only used by `z-TableHeader` |
| `use-sort-dir.ts` | only used by `z-TableHeader` |
| `use-page.ts` | superseded by `use-list-state.page` |

### Phase A.2 — remove the attention filter (decided: delete outright)

You chose to drop the capability rather than fold it into `Filter`. For the record,
`filterProducts` composes every group with AND and both `stock` and `margin` are
single-select, so `loss ∪ low ∪ out` was never expressible in the popover — the
toolbar toggle was the only route to it. After this, "perlu perhatian" is three
manual passes (`Stok=Menipis`, `Stok=Habis`, `Margin=Rugi`) with no total and
overlapping rows double-counted by eye.

| file:line | change |
|---|---|
| `z-Toolbar.tsx:48-78` | delete the whole `AttentionToggle` component |
| `z-Toolbar.tsx:31-36` | delete the `<AttentionToggle …/>` usage; header leaves `h1` + count left, `ViewToggle` right |
| `z-Toolbar.tsx:15, 21` | drop `attentionCount` from the props type + destructuring |
| `z-Toolbar.tsx:1, 3` | drop the now-unused `AlertTriangle` (lucide-react) and `cn` (`~/lib/utils`) imports — both were only used by `AttentionToggle` |
| `page.tsx:9` | `import { filterProducts, needsAttention }` → `import { filterProducts }` |
| `page.tsx:57` | delete `const attentionCount = useMemo(… needsAttention …)` |
| `page.tsx:72` | delete the `attentionCount={…}` prop |
| `page.tsx:79` | drop `attention: false` from the `Empty` reset patch |
| `use-list-state.ts:26` | drop `attention: boolean` from `ListState` |
| `use-list-state.ts:50` | drop `attention: params.get("attention") === "true"` |
| `use-list-state.ts:86-89` | drop the `patch.attention` branch |
| `use-filtered.ts:18-20` | delete `needsAttention` |
| `use-filtered.ts:58-60` | drop `if (state.attention) { … }` from `filterProducts` |

Kept: `isLoss` (still powers `Margin=Rugi`, the table row tint at
`z-ProductTable.tsx:41`, and `LossBadge` at `z-ProductGrid.tsx:35`),
`stockStatus`, and `LOW_STOCK_THRESHOLD` (still powers `Stok=Menipis` and the
`StockBadge` colour).

Note: `use-list-state`'s `set()` only deletes search params it owns, so an old
bookmark like `?attention=true` is simply ignored — no migration needed.

Also: `Detail/Info/index.tsx` and `Detail/Performance/index.tsx` have a bare
`<Suspense>` (no `fallback`) → blank flash on lazy load. Add
`fallback={<Loading />}` / a local skeleton for consistency with `index.tsx`,
`New/index.tsx`, `Detail/Image/index.tsx`.

---

## Phase B — type scale (exact diffs)

### `z-ProductBits.tsx`
| line | from | to |
|---|---|---|
| 28 | `... py-0.5 text-xs font-medium tabular-nums` | `text-tiny` |
| 39 | `... py-0.5 text-xs font-medium text-destructive` | `text-tiny` |
| 51 | `... py-0.5 text-xs text-muted-foreground` | `text-tiny` |
| 56 | `className="text-xs text-muted-foreground"` | `text-tiny` |

### `z-Toolbar.tsx`
| line | from | to |
|---|---|---|
| 28 | `<span className="text-normal text-muted-foreground">{total} produk</span>` | `text-small` |

### `z-Filter.tsx`
| line | from | to |
|---|---|---|
| 48 | `<span className="rounded-full bg-primary px-1.5 text-xs ...">` | `text-tiny` |
| 57, 73, 88 | `<span className="text-normal font-medium">Jenis/Stok/Margin</span>` | `text-small font-medium` |
| 60, 80, 95 | `<Label ... className="flex cursor-pointer items-center gap-2 text-normal">` | `text-small` (drops the redundant `text-normal`; `ui/Label` bakes it in) |

### `z-Search.tsx`
| line | from | to |
|---|---|---|
| 18 | `className="absolute left-3 size-4 text-muted-foreground small:size-3.5"` | `absolute left-3 size-6 text-muted-foreground small:size-5` |
| 29 | `className="pl-9 pr-8"` | `pl-11 pr-12` |

### `z-ProductGrid.tsx`
| line | from | to |
|---|---|---|
| 44 | `className="line-clamp-2 font-medium leading-tight"` | add `text-small` |
| 46 | `className="text-normal tabular-nums text-muted-foreground"` | `text-small tabular-nums text-muted-foreground` |
| 48 | `className="text-xs text-muted-foreground"` | `text-tiny` |

> Grid card text at `text-small` keeps it consistent with the table's
> `text-small` for the same fields. Say the word if you want card **names** at
> `text-normal` (30px) instead — it reflows to 2–3 lines at `xl:grid-cols-5`.

### `z-ProductTable.tsx`
| line | from | to |
|---|---|---|
| 19 | `<Table className="text-normal">` | `className="text-small"` |

### `z-Empty.tsx`
| line | from | to |
|---|---|---|
| 7 | `<PackageOpen className="size-12" />` | `size-12 small:size-8` |
| 8 | `<p className="text-normal">` | `text-small` |

### `z-Pagination.tsx`
| line | from | to |
|---|---|---|
| 22 | `className="text-normal tabular-nums text-muted-foreground"` | `text-small` |
| 49 | `className="min-w-12 text-center text-normal tabular-nums"` | `text-small` |

### `Form/z-Field.tsx`
| line | from | to |
|---|---|---|
| 21 | `<label ... className="text-normal font-medium">` | `text-small font-medium` |
| 26 | `<p className="text-xs text-muted-foreground">` | `text-tiny` |
| 27 | `<p className="text-xs text-destructive">` | `text-tiny` |

### `Form/z-Section.tsx`
| line | from | to |
|---|---|---|
| 22 | `<h2 className="font-semibold">` | `className="text-small font-semibold"` |
| 24 | `<p className="text-normal text-muted-foreground">{description}</p>` | `text-tiny` |
| 30 | `<p className="text-xs text-destructive">{error}</p>` | `text-tiny` |

> `24` is the 24px→14px jump you picked (h2 `small`, desc `tiny`). If that reads
> too tight I'd put the description at `text-small text-muted-foreground` and
> leave `tiny` for hints/errors only.

### `Form/z-ListingsFields.tsx`
| line | from | to |
|---|---|---|
| 82 | `<span className="text-normal font-medium text-muted-foreground">Listing {index+1}</span>` | `text-small font-medium` |
| 131 | `<label className="flex items-center gap-2 text-normal">` | `text-small` |

### `Form/z-StocksFields.tsx`
| line | from | to |
|---|---|---|
| 61 | `<p className="text-normal text-muted-foreground">Total …</p>` | `text-tiny` |

### `Form/z-PropertiesFields.tsx`
| line | from | to |
|---|---|---|
| 35 | `<p className="text-normal text-muted-foreground">Belum ada properti.</p>` | `text-small` |

### `New/page.tsx`
L34 `text-big` — keep.

### `Detail/page.tsx`
| line | from | to |
|---|---|---|
| 41 | back link `className="flex items-center gap-1 text-normal text-muted-foreground ..."` | `text-small` |
| 42-44 | `<span className="truncate font-semibold">` | `<span className="truncate text-normal font-semibold">` (make the inherited 30px explicit) |
| 55 | tab `className="... text-normal font-medium transition-all"` | `text-small font-medium` |

### `Detail/Info/z-UserInfo.tsx`
| line | from | to |
|---|---|---|
| 10 | `<h2 className="font-semibold">Info Barang</h2>` | `className="text-small font-semibold"` |
| 19, 35, 47 | `<span className="text-normal font-medium text-muted-foreground">` | `text-small font-medium` |
| 21, 37 | `<div ... className="flex items-center justify-between gap-2 text-normal">` | `text-small` |
| 24 | `<span className="text-xs text-muted-foreground">` | `text-tiny` |
| 50 | `<p className="text-normal leading-relaxed">` | `text-small leading-relaxed` |
| 60 | `<span className="text-normal font-medium text-muted-foreground">{label}</span>` | `text-tiny font-medium` |
| 61 | `<span className="break-all text-right text-normal">` | `text-small` |

### `Detail/Info/z-StockConsume.tsx`
| line | from | to |
|---|---|---|
| 72 | `<p className="text-normal text-muted-foreground">Stok tersedia…</p>` | `text-tiny` |

### `Detail/Info/History/index.tsx`
| line | from | to |
|---|---|---|
| 27 | `<h2 className="font-semibold">Riwayat</h2>` | `className="text-small font-semibold"` |
| 28 | mode strip `className="inline-flex rounded-md border p-0.5 text-normal"` | `text-small` |
| 49 | `<p className="py-6 text-center text-normal text-muted-foreground">` | `text-small` |

### `Detail/Info/History/z-HistoryTable.tsx`
| line | from | to |
|---|---|---|
| 11 | `<span className="text-normal tabular-nums">` | `text-small` |
| 14 | `<span className="truncate text-xs text-muted-foreground">` | `text-tiny` |
| 21 | `"text-normal font-medium tabular-nums"` | `text-small font-medium tabular-nums` |

### `Detail/Performance/page.tsx`
L33 interval toggle `text-normal` → `text-small`.

### `Detail/Performance/z-Summary.tsx`
| line | from | to |
|---|---|---|
| 18 | `<span className="text-normal text-muted-foreground">{label}</span>` | `text-tiny` |
| 21 | `<span className={accent ? "font-semibold text-destructive" : "font-semibold"}>` | add `text-normal tabular-nums` to both branches |

### `Detail/Performance/z-Charts.tsx`
L26 `<h3 className="text-normal font-medium">` → `text-small font-medium`.

### `Detail/Image/page.tsx`
| line | from | to |
|---|---|---|
| 91 | `<h2 className="font-semibold">Gambar</h2>` | `className="text-small font-semibold"` |
| 92 | `<p className="text-normal text-muted-foreground">{images.length} gambar</p>` | `text-tiny` |
| 107 | `<ImageOff className="size-12" />` | `size-12 small:size-8` |
| 108 | `<p className="text-normal">Belum ada gambar.</p>` | `text-small` |

### `Detail/Image/z-AddButton.tsx`
L87 `<span className="text-xs text-destructive">` → `text-tiny`.

### `Detail/Image/z-ThumbRail.tsx`
L109 `className="absolute left-1 top-1 rounded bg-primary px-1 text-[10px] text-primary-foreground"` → `text-tiny`.

---

## Phase C — sizing / `small:` variants

`small:` currently appears 16× in `Product/` vs 257× in the rest of the app.

### Shell height magic numbers
Effective heights today are inconsistent because `global.css` clamps every
`<main>`: `main { max-height: calc(100vh - 68px) }`, and inside `.small`
`main { max-height: calc(100vh - 44px) }`. So Product's
`h-[calc(100vh-64px)] small:h-[calc(100vh-48px)]` is silently clamped to
`68px`/`44px` — the declared `64`/`48` never take effect.

| file | from | to |
|---|---|---|
| `page.tsx:70` | `h-[calc(100vh-64px)] … small:h-[calc(100vh-48px)]` | `h-[calc(100vh-68px)] … small:h-[calc(100vh-44px)]` |
| `New/page.tsx:33` | same | same |
| `Detail/page.tsx:37` | same | same |
| `Detail/z-Loading.tsx:4` | `max-h-[calc(100vh-68px)] small:max-h-[calc(100vh-44px)]` | keep (already correct) |

(No `global.css` change needed — declared values simply align with the clamp.)

### Controls

| file:line | from | to |
|---|---|---|
| `z-Filter.tsx:42` | `<Button … className="gap-2">` | `className="h-[54px] gap-2 text-small small:h-10"` |
| `z-Filter.tsx:104` | Reset `<Button variant="ghost" …>` | add `className="h-11 text-small small:h-9"` |
| `z-Filter.tsx:50` | `<PopoverContent … className="flex w-72 flex-col gap-4">` | add `small:w-60` |
| `z-Sort.tsx:30` | `<SelectTrigger className="h-9 w-[130px]">` | `className="h-[54px] w-[130px] text-small small:h-10 small:w-[105px]"` |
| `z-Sort.tsx:38-44` | dir `<Button variant="outline" size="icon">` | drop `size`, `className="size-[54px] text-small small:size-10"` |
| `z-Search.tsx:35` | clear `<Button … className="absolute right-1 size-7">` | `absolute right-1.5 size-10 small:size-7` |
| `z-ViewToggle.tsx:17` | group `className="inline-flex items-center rounded-md border p-0.5"` | `inline-flex h-[54px] items-center rounded-md border p-0.5 small:h-10` |
| `z-ViewToggle.tsx:19, 29` | `cn("size-10 small:size-8", …)` | `cn("size-full", …)` |
| `z-Pagination.tsx:26-36` | raw `<select className="h-8 …">` | → `ui/Select`, `h-11 small:h-9 text-small` (see Phase E) |
| `z-Pagination.tsx:41, 52` | prev/next `<Button variant="ghost" size="icon">` | drop `size`, `className="size-11 small:size-9"` |
| `z-ProductTable.tsx:56` | action `<Button asChild variant="ghost" size="icon">` | drop `size`, `className="size-11 small:size-9"` |
| `Form/*` add buttons (Listings 30, Stocks 38, Properties 25) | `size="sm"` | drop `size`, `className="h-11 gap-1 text-small small:h-9"` |
| `Form/*` row delete buttons (Listings 91, Stocks 112, Properties 70) | `size="icon"` | drop `size`, `className="size-11 small:size-9"` |
| `Form/z-ListingsFields.tsx:155` | raw select `className="h-9 rounded-md border bg-transparent px-2 text-normal"` | → `ui/Select` (Phase E) |
| `Detail/page.tsx:49` | tab strip `className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 …"` | drop `h-9`; strip sizes itself from `p-1` + `text-small` tabs |
| `Detail/Info/History/index.tsx:58` | `<Button variant="outline" size="sm">` | drop `size`, `className="h-11 text-small small:h-9"` |
| `Detail/Image/z-Preview.tsx:41, 52, 70` | `size="icon"` icon buttons | drop `size`, `className="size-11 small:size-9"` |
| `Detail/Image/z-Preview.tsx:63` | `<Button variant="secondary" size="sm">Jadikan cover` | drop `size`, `className="h-11 text-small small:h-9"` |
| `Detail/Image/z-AddButton.tsx:69` | `<Button … className="gap-1">` | `className="h-[54px] gap-1 text-small small:h-10"` |
| `Detail/Image/z-ThumbRail.tsx:96` | `className="block size-20 overflow-hidden rounded-lg border-2 bg-muted/40"` | `size-20 small:size-16` |
| `Detail/Image/z-Loading.tsx:6, 10` | `h-8 w-40` / `size-20` | `h-10 w-40` / `size-20 small:size-16` |
| `Detail/z-Loading.tsx:61, 67` | `small:grid-cols-2` / `small:grid-cols-3` | `md:grid-cols-2` / `md:grid-cols-3` (columns are viewport-driven elsewhere) |

> **Judgement call:** I'm making the whole toolbar row exactly
> `54px / 40px` including labeled buttons, so a `Select` no longer sits at 52px
> next to a 54px `Input`. Tell me if you'd rather keep `Button`'s natural
> `h-fit py-2` height.

---

## Phase D — icons

All `→ icon` (30px / 20px). Wrapped in a `size-*` box by the rules above.

| file:line | current |
|---|---|
| `z-Filter.tsx:45` | `<SlidersHorizontal className="size-4" />` |
| `z-Search.tsx:41` | `<X className="size-4" />` |
| `z-Sort.tsx:48` | `<ArrowUp / ArrowDown className="size-4" />` |
| `z-ViewToggle.tsx:23, 33` | `className="size-8 small:size-6"` |
| `z-Pagination.tsx:47, 60` | `<ChevronLeft / ChevronRight className="size-4" />` |
| `z-ProductTable.tsx:57` | `<SquareArrowOutUpRight className="size-4" />` |
| `page.tsx:94` | `<Plus className="size-5" />` (FAB) |
| `Form/z-ListingsFields.tsx:35, 91` | `<Plus>` / `<Trash2 className="size-4" />` |
| `Form/z-StocksFields.tsx:43, 112` | `<Plus>` / `<Trash2>` |
| `Form/z-PropertiesFields.tsx:30, 70` | `<Plus>` / `<Trash2>` |
| `Detail/page.tsx:43` | `<ChevronLeft className="size-4" /> Produk` |
| `Detail/Info/z-UserInfo.tsx:9` | `<Package className="size-5 text-primary" />` |
| `Detail/Info/History/*` | — |
| `Detail/Image/z-AddButton.tsx:84` | `<ImagePlus className="size-4" />` |
| `Detail/Image/z-Preview.tsx:46, 57, 75` | `<ChevronLeft/ChevronRight/Trash2 className="size-4" />` |
| `Detail/Image/z-ThumbRail.tsx:123` | `<X className="size-3" />` → `size-4` |

Kept as-is (inline / illustration context):

| file:line | class |
|---|---|
| `z-ProductBits.tsx:40` | `size-3` → `size-4 small:size-3` (inline in badge) |
| `z-ProductGrid.tsx:33` | `size-10 small:size-8` (placeholder) |
| `z-Empty.tsx:7`, `Detail/Image/page.tsx:107` | `size-12 small:size-8` (illustration) |
| `Detail/Info/z-UserInfo.tsx:48` | `size-4 small:size-3` (inline in label) |
| `z-Search.tsx:18` | `size-6 small:size-5` (adornment) |

---

## Phase E — component consistency

1. **`z-Pagination.tsx:26-36`** — raw `<select>` → `ui/Select` (same component
   `z-Sort.tsx` already uses). Options are static `PAGE_SIZES`.
2. **`Form/z-ListingsFields.tsx:137`** — raw
   `<input type="checkbox" className="size-4">` → `ui/Checkbox` (25px target,
   same as `z-Filter`).
3. **`Form/z-ListingsFields.tsx:150`** — raw `<select>` for `codeKind` →
   `ui/Select`.
4. **`window.confirm` → `~/components/ConfirmDialog.tsx`** (new, ~40 lines).
   Two call sites: `Detail/Info/z-EditPane.tsx:handleDelete`,
   `Detail/Image/page.tsx:handleDelete`. Pattern copied from
   `Customer/z-DeleteBtn.tsx` (`Dialog` + `DialogTitle text-normal` +
   `DialogDescription text-small`), but with `open`/`onOpenChange` controlled by
   the caller so `window.confirm`'s imperative `if (!confirm) return` becomes a
   confirm callback. This is the only file this plan adds outside `Product/`.

---

## Phase F — dark mode (revised on implementation)

**Findings during implementation:**

1. **Dark mode is unreachable.** Nothing in the codebase ever applies the
   `.dark` class — there is no theme switch and no `prefers-color-scheme` query.
   `src/layouts/root.tsx` only toggles `small`. The `.dark` CSS block in
   `global.css` is dead shadcn init scaffolding, and `dark:` appears **0×**
   repo-wide.
2. **`var()` inside SVG presentation attributes is unreliable.** `fill`/`stroke`
   are parsed as CSS values but the spec does not sanction `var()` there, and the
   repo had no precedent. Recharts passes those as attributes.

So the two halves were split:

| change | applied? | why |
|---|---|---|
| `dark:` variants on the stock/loss badges and history delta | **yes** | plain Tailwind utilities, zero risk, correct if dark mode ever lands |
| chart palette `var(--chart-n)` in `fill`/`stroke` | **reverted to concrete hex** | unverifiable + no payoff while dark is unreachable |
| chart grid `stroke="var(--border)"`, tick `fill="var(--muted-foreground)"` | **reverted** | same reason |
| tooltip `contentStyle` using `var(--popover)` / `var(--border)` | **yes** | lands in an inline `style`, where `var()` definitely works |

Applied:

| file:line | from | to |
|---|---|---|
| `z-ProductBits.tsx:23` | `text-emerald-700` | `text-emerald-700 dark:text-emerald-400` |
| `z-ProductBits.tsx:24` | `text-amber-700` | `text-amber-700 dark:text-amber-400` |
| `Detail/Info/History/z-HistoryTable.tsx` | `text-emerald-600` | `text-emerald-600 dark:text-emerald-400` |
| `Detail/Performance/z-Charts.tsx` | bare `Tooltip` | `contentStyle` / `labelStyle` via `var(--popover)` etc. |

`z-Charts.tsx` carries a comment recording this, so the palette isn't
re-`var()`-ified without re-checking the dark-mode premise.

(`z-Limit.tsx`'s `bg-white` disappeared with Phase A.)

---

## Phase G — layout shell

**`page.tsx` renders the loading fallback outside `<main>`.** `<Loader>` is the
root of `List()`, and `<main>` lives inside `Content`, so the skeleton gets no
`main` height cap and no `px-4` — content jumps on hydrate.

```tsx
// before
function List() {
  const res = useStream(service.product.get.changes);
  const { state, set } = useListState();
  return (
    <Loader res={res} fallback={<Loading view={state.view} />}>
      {({ data: products }) => <Content products={products} state={state} set={set} />}
    </Loader>
  );
}
// Content returns <main className="relative flex h-[calc(100vh-68px)] …">

// after — shell hoisted, Content returns a fragment
function List() {
  const res = useStream(service.product.get.changes);
  const { state, set } = useListState();
  return (
    <main className="relative flex h-[calc(100vh-68px)] flex-col overflow-hidden small:h-[calc(100vh-44px)]">
      <Loader res={res} fallback={<Loading view={state.view} />}>
        {({ data: products }) => <Content products={products} state={state} set={set} />}
      </Loader>
    </main>
  );
}
```

`Loading` then inherits the shell's padding instead of adding `pt-2` — add
`h-full overflow-y-auto px-4 py-2` to its root.

`z-Loading.tsx` grid also drifts from `ProductGrid`: loading has
`grid-cols-2 md:3 lg:4 xl:5`, loaded grid has `grid-cols-2 gap-3 pb-4 md:3 lg:4 xl:5`.
Align them.

---

## Phase H — chart polish

1. **`useSize()` for tick geometry.** `Detail/Performance/z-Charts.tsx` hardcodes
   `fontSize: 11`. This is the sanctioned `useSize()` case (geometry, not
   styling):
   ```tsx
   const size = useSize();
   const tick = { fontSize: size === "small" ? 12 : 14, fill: "var(--muted-foreground)" };
   const yWidth = size === "small" ? 44 : 56;
   ```
2. **`ChartFrame` height** `h-56` → `h-56 small:h-48`.
3. **`ListingChart` is the 5th chart in a `lg:grid-cols-2` grid** → it lands
   alone in the last row. Give `ChartFrame` an optional `className` and pass
   `lg:col-span-2` for the pie (or move it to its own row).
4. **Pie labels overlap** at small radii. Drop `label`, add `<Legend />`, keep
   the `Tooltip`.

---

## Phase I — UX

**`z-StockConsume` is an instant-action form nested inside a diff-and-Save form.**
`EditPane` renders `InfoFields / ListingsFields / StocksFields / StockConsume /
PropertiesFields / sticky-Simpan`. Everything there is staged until Simpan —
except `StockConsume`, whose "Kurangi" button calls
`service.product.stock.consume` immediately.

Minimal fix (no behaviour change): make the immediacy visible —
- wrap it in a dashed-border variant so it reads as distinct from the
  `bg-card` sections,
- change `description` to `"Catat stok keluar tanpa transaksi (rusak, hilang,
  koreksi). Langsung tersimpan, tidak menunggu Simpan."`,
- move it **after** `PropertiesFields` so it's the last thing before the sticky
  bar rather than interrupting the staged fields.

Alternative (bigger): move stock-consume into its own dialog triggered from the
header. Say which you prefer.

---

## Phase K — `isLoss` ignores `listing.unit` (correctness, independent of A.2)

`use-filtered.ts:12`:

```ts
return product.listings.some((listing) => listing.price <= product.capital);
```

`product.capital` is a weighted average **per pcs** (`live.ts:191-206`), but
`listing.price` is the price of a whole `unit` bundle (form hint: "1 = 1 pcs,
12 = 1 lusin"). So for any `unit > 1` a bundle price is compared against a
per-pcs cost:

| listing | unit | price | capital/pcs | true margin | flagged? |
|---|---|---|---|---|---|
| Eceran | 1 | 50.000 | 50.000 | 0% | **yes** |
| Grosir | 12 | 600.000 | 50.000 | 0% | no |
| Grosir | 12 | 500.000 | 50.000 | −16% | no |

A bundle price is always ≥ its per-pcs cost, so `unit > 1` listings are
**structurally never flagged** — wholesale losses are invisible. This affects
`Margin=Rugi` and the loss row tint in table/grid mode, not just the attention
filter being removed above.

Fix — normalise to per-pcs on both sides:

```ts
return product.listings.some(
  (listing) => listing.unit > 0 && listing.price / listing.unit <= product.capital,
);
```

This changes `Margin=Rugi` results (more rows match), so it wants its own
verification pass. **Decided: included in this pass.**

---

## Phase L — self-diagnosing empty state

Found while testing: filtering to `Stok=Ada` on top of an already-active
`Jenis`/`Margin` selection returned zero rows, and the empty state said
`Tidak ada produk yang cocok.` — identical to what you'd see for a genuinely
empty catalog. That compose-with-AND behaviour is correct (see Phase A.2 for the
same union-vs-intersection point), but the copy made it read as a data problem.

`Empty` now takes the **unfiltered** count and distinguishes the two cases:

| situation | message | Reset button |
|---|---|---|
| filters matched nothing (`total > 0`) | `Tidak ada dari {total} produk yang cocok.` | shown |
| catalog is empty (`total === 0`) | `Belum ada produk.` | **hidden** — it was a no-op |

| file | change |
|---|---|
| `z-Empty.tsx` | add `total` prop, branch the copy, conditionally render the button |
| `page.tsx` | pass `total={products.length}` (unfiltered, not `filtered.length`) |

---

## Phase M — `url_back` on the detail links

Product's list state lives in search params (`use-list-state.ts`), but every link
into the detail shipped a bare `/products/:id`, and the detail's back link was a
hardcoded `/products`. So opening a product from a filtered list and hitting back
**threw the whole filter state away**.

Convention (already used by Debt/Money/Extra/Record/Analytics):

- `useGenerateUrlBack(base)` → `base?<current search>` — produce the return URL
- `useGetUrlBack(default)` → read `url_back`, falling back to `default`

| file | change |
|---|---|
| `page.tsx` | `const urlBack = useGenerateUrlBack("/products")` once, in `Content` |
| `z-ProductGrid.tsx` | `ProductCard` link → `{ pathname, search: \`url_back=…\` }`; `urlBack` threaded from `ProductGrid` |
| `z-ProductTable.tsx` | row action link → same; `urlBack` threaded from `ProductTable` |
| `page.tsx` (FAB) | `+` → `/products/new` carrying `url_back` |
| `New/page.tsx` | `useGetUrlBack("/products")` for **Batal**, and forwarded onto the post-create `/products/:newId` redirect |
| `Detail/page.tsx` | back link `to={backUrl}`, and the **tab links carry `url_back`** — without this, switching tabs dropped the param and back fell through to unfiltered `/products` |
| `Detail/Info/z-EditPane.tsx` | after delete, `navigate(backUrl)` instead of `navigate("/products")` |

Two things worth noting:

- `Detail/page.tsx` uses **`useGetUrlBack`, not `useGenerateUrlBack`**. Generating
there would read the *detail* page's own params and produce
`/products?url_back=…` — a wrong target. Reading is what preserves the list URL
across tab switches.
- **This also fixes the global topbar back button.**
`layouts/authenticated/z-Topbar.tsx` uses `useGetUrlBack("/")`, so back from a
product detail previously dumped you on the **home page**.

---

## Phase N — show listing codes in the card/table representation

Codes live on **listings** (`listing_code` / `listing_code_kind`), one per
listing, so a product carries 0..N. `normalizeCode` (`live.ts:240`) returns
`[null, null]` for an empty code and defaults `codeKind` to `"barcode"`
otherwise, so `listing.code !== null` implies `codeKind` is set.

Added `ListingCodes` to `z-ProductBits.tsx` as a sibling of `KindChips`, so both
representations share one implementation.

| file | change |
|---|---|
| `z-ProductBits.tsx` | new `ListingCodes({ product, max = 2 })` |
| `z-ProductTable.tsx` | rendered in the **Nama** cell, between the name and `KindChips` |
| `z-ProductGrid.tsx` | rendered in the card body, between the name and the price |

Decisions:

- **Placement — under the name, no new column.** Matches
  `Shop/z-Right/Product/z-Search/z-ProductCard.tsx` exactly (`font-mono text-tiny`
  muted, under the name), keeps the column count and widths untouched, and joins
  the existing metadata cluster with `KindChips`. A dedicated `Kode` column (what
  the deleted `z-TableHeader.tsx` had) was rejected as it would squeeze the
  already-flexing Nama column on a tablet.
- **Multiplicity — first 2, then `+N`.** Mirrors `KindChips`' `max` + `+N`, so row
  height stays bounded regardless of listing count.
- **Deduped via `Set`** — keys off the code value, and also prevents a duplicate
  React key if two listings ever share a code.
- Renders `null` when the product has no coded listings, so uncoded products are
  byte-identical to before.
- **`max-w-[18ch]` is load-bearing.** A table cell has no definite width, so
  `truncate`'s `whitespace-nowrap` would otherwise let a long QR payload stretch
  the Nama column and squeeze Harga/Modal/Stok. The cap gives `truncate`
  something to clip against.
- **`title`** is set on each code span and on the `+N` chip, so truncated values
  and the hidden remainder stay reachable on hover.
- **`formatBarcode` deliberately not used.** It chunks every 14 chars and joins
  with `\n` — that renders in a `TableCell` (no `whitespace-nowrap`, unlike the
  old `Kode` column's use in `Analytics/Product/z-ProductRow.tsx`) but not in the
  single-line chip placement chosen here. If a `Kode` column is added later,
  `formatBarcode` becomes the right call there.
- **No barcode/QR visual distinction** — `codeKind` is metadata, and the card/row
  is already dense. Easy to add as an icon if wanted.

Not changed (out of the requested scope): the detail page's read-only listing
rows in `Detail/Info/z-UserInfo.tsx` still show only `(jenis · ×unit)`.

---

## Phase O — `text-tiny` withdrawn (standing rule)

**Rule (declared by the project owner):** do not use `text-tiny`. It is reserved
as a manual escape hatch for the owner. `text-small` is the smallest size an
agent may apply.

Applied: all **15** `text-tiny` sites in `src/pages/Product/` → `text-small`.
All 15 were introduced by this pass (the pre-rewrite page had zero), so the sweep
was clean. `--text-font-size-tiny` itself is untouched in `global.css` — the rule
is about agent usage, not the token.

| | before | after |
|---|---|---|
| `text-tiny` | 15 | **0** |
| `text-small` | 51 | **66** |

Recorded durably in `.pi/skills/services.md` §5 so future sessions honour it.

### Consequences to be aware of

1. **Label/value pairs collapse to one size.** These now differ only by weight
   and colour, not size — `z-UserInfo` row labels vs values, `z-Section` heading
   vs description, `z-Field` label vs hint. If a size hierarchy is wanted back,
   the way to get it inside the rule is to lift the *other* half to
   `text-normal`, not to reinstate `text-tiny`.
2. **Badge padding is now under-proportioned.** `StockBadge` / `LossBadge` /
   `KindChips` / `ListingCodes` were padded for 14px text (`px-2 py-0.5`). At
   `text-small` (24px in `big`) the pills are ~1.7× taller with unchanged
   padding. Bumping to `px-2.5 py-1` would restore proportion — left alone
   because it is a visual judgement, not a class-rule one.
3. **Chart axis ticks were the one `text-tiny`-equivalent shown to keep.**
   `z-Charts.tsx` maps them to `useSize()` geometry (12px/14px), not a class, so
   they are unaffected by this rule.

### Unrelated inconsistency spotted while sweeping

`priceRange()` in `z-ProductBits.tsx` was changed to prefix `Rp`, but
`formatPrice()` was not. So the same table renders `Harga: Rp95.000` next to
`Modal: 80.000`, and `z-UserInfo` / `z-Summary` render bare numbers. Either move
`Rp` into `formatPrice` (one place, everything consistent) or drop it from
`priceRange`. Left alone — it is an in-flight edit, not mine.

---

## Verification — results

`npx tsc --noEmit`, diffed against a pristine `git worktree` at `HEAD`:

| | errors |
|---|---|
| baseline (`HEAD`) | 805 |
| after this pass | **803** |
| new errors introduced | **0** |
| errors in `src/pages/Product/` | **0** |
| errors removed | 2 (`src/hooks/use-get-products.ts`) |

`npx eslint src/pages/Product src/hooks/use-get-products.ts src/lib/constants.ts`
→ exit 0, no output. `npx vite build` → `✓ built in 5.67s`.

Class distribution in `src/pages/Product/`:

| | before | after |
|---|---|---|
| `text-big` | 2 | 2 |
| `text-normal` | 41 | **4** (all deliberate: summary card values, `DialogTitle`, detail header name) |
| `text-small` | 1 | **51** |
| `text-tiny` | 0 | **19** |
| `icon` utility | 0 | **21** |
| `small:` variants | 16 | **48** |
| raw `text-xs` / `text-[Npx]` | 14 | **0** |

### Gotcha found during verification

My initial "is this file dead?" check was scoped to `src/pages/Product/`, so it
missed an importer outside the directory: `src/hooks/use-get-products.ts`
imported `setLength` from the deleted `Product/use-length`. That file is itself
unreachable dead legacy (it imports `~/database`, removed in `ce4e449`, and
`Record/Item/z-Detail` — its only consumer — is routed from nowhere), so it
already contributed 5 errors. Dropping the `setLength` import and the
`pipe`/`setLength` wrapper removed 2 of them.

**Flagged, not touched:** the wider dead chain behind it —
`src/hooks/use-get-products.ts`, `src/pages/Record/Item/z-Detail/**`,
`src/lib/sync/product*/**`, `src/pages/Stock-PENDING/**`. That's a separate
cleanup on a different page's code.

### Automated gates (all PASS, 0 hits under `src/pages/Product/`)

```
text-(xs|sm|base|lg|xl|2xl|3xl)([^a-z-]|$)
text-\[[0-9]+px\]
size="sm" | size="icon"
window.confirm
attention | needsAttention
```

### Still needs a human pass

I could not exercise the UI. Walk these in `npm run dev`:

1. `/products` — toolbar row is now uniform `54px` (big) / `40px` (small); check
   the `Filter` / `Sort` / sort-direction / `ViewToggle` alignment.
2. Toggle **Pengaturan → Toko → Ukuran: Kecil** and re-walk. Every control must
   shrink; no clipped text, no scrollbar inside a fixed-height box.
3. Table + grid + footer; then `/products/new`; then `/products/:id` on all three
   tabs (Info, Gambar, Performa).
4. **Icons went 16px → 30px.** That was the agreed decision, but it is the
   loudest visual change — confirm it reads as intended rather than oversized.
5. **`Margin=Rugi` now matches more rows** (Phase K). Confirm the wider match set
   is genuinely correct and not a false positive.
6. Delete flows: `Hapus` on a product (Info tab) and on an image — both now use
   the in-app dialog instead of `window.confirm`.
7. Error inside the delete dialog (e.g. force a failure) — the message should
   render inside the dialog.
8. Empty state (Phase L) — filter everything away and confirm it reads
   `Tidak ada dari N produk yang cocok.`; a catalog with zero products must show
   `Belum ada produk.` with no Reset button.
9. `url_back` (Phase M) — apply a filter (`Stok=Menipis`, `page=2`, `view=table`),
   open a product from **both** grid and table mode, switch all three tabs, then
   hit the `← Produk` link and the topbar back button. Both must land on the
   filtered list, still on page 2 in table mode. Repeat via `+` → Tambah →
   Simpan, and via deleting a product.
10. Listing codes (Phase N) — a product with no codes must look unchanged; one
    with 1 code shows a single mono line; one with 4 shows 2 lines + `+2`. Check a
    long QR payload stays clipped at `18ch` with a working `title` on hover, and
    that Turkish-bath-unfriendly long codes do **not** widen the Nama column.

---

## Verification (original checklist)

1. `npm run lint` — clean.
2. `npm run dev`, open `/products` with devtools; walk the 3 worst screens:
   - `/products` (toolbar + table + grid + footer)
   - `/products/new` (form)
   - `/products/:id` Info / Gambar / Performa
3. Toggle **Pengaturan → Toko → Ukuran: Kecil** (`body.small`) and re-walk —
   every control must shrink; no clipping, no scrollbar appearing inside a
   fixed-height box.
4. Toggle the `.dark` class and re-walk — no invisible text, chart axis/legend
   readable.
5. Grep gates that must return **0** hits under `src/pages/Product/`:
   ```
   text-xs | text-sm | text-base | text-lg | text-xl | text-[0-9]+px | fontSize:
   size="sm" | size="icon" | attention | needsAttention
   ```
   (exceptions: nothing — every case above has a replacement.)
6. Confirm the 11 deleted files have zero importers (`grep -rn <basename> src`).

## Risks

- **Icon size jump (16 → 30px)** is the biggest visual delta; needs a look in
  the app before it's "done".
- **Grid card name at `text-small`** vs `text-normal` — reversible one-liner.
- **`Select` swap in the pagination footer** adds a Radix portal where a native
  control was; slightly heavier, but matches `z-Sort`.
- **`ConfirmDialog`** is now `Product/z-ConfirmDelete.tsx` (decided), so no file
  outside `Product/` is added.
- **Phase A.2 removes the live `attentionCount` counter.** Restoring that
  capability later means either re-adding this component or adding OR semantics
  across filter groups in `filterProducts` — the latter is the more useful fix if
  it ever comes back.
