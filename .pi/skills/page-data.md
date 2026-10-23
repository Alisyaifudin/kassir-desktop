---
name: page-data
description: How to build a page's async data with createPageData/Gate — one key per independent read, per-widget gating, fine-grained value placeholders (pulse the value, never swap the card), reserved card heights (ROWS_FLOOR) so loading never shifts layout, the 200 ms anti-flash window, mutations and the refetching flag, Provider deps for params, and error isolation. Use whenever creating or migrating a page under src/pages/, adding async data to a component, wiring a write that changes page data, or auditing a page that blocks on a top-level Loader. src/pages/Home is the reference implementation.
---

# Page data — `~/components/page-data`

Replaces the `useStream` + `<Loader>` shape where one result gates the whole tree.

```
page.tsx   one Provider, every source registered once, in parallel
data.ts    the typed contract: HomeData + HomeError
day.ts     the reads, one per key (Stream = live, Effect = read once)
z-*.tsx    leaves read the key they need and decide what loading looks like
```

## Two rules this pattern is judged on

1. **Fine-grained loading.** Only the values pulse — never the card around them.
2. **Reserved space.** A card with async data holds its height from the first
   frame, so the swap from placeholder to data moves nothing.

Getting either wrong is a bug, not a preference. Both are explained below with
the mistakes that were made first.

---

## 1. Gate the widget, not the page

```tsx
// BEFORE — one Loader above everything; the header, the menu and both card
// frames all wait for the day's query, and the pockets only start after it.
<Loader res={useDay()} fallback={<DayLoading />}>
  {({ data }) => <Workspace day={data} />}   {/* stats + ledger + uang */}
</Loader>

// AFTER — the page registers keys; each region reads its own.
<pageData.Provider sources={sources} deps={[dayStart, role]}>
  <Header dayStart={dayStart} />   {/* static */}
  <Band />                         {/* pulses its three figures */}
  <div className="grid …">
    <Ledger />                     {/* static head, reserved rows */}
    {isAdmin ? <Uang /> : null}    {/* its own service, its own key */}
  </div>
  <Menu />                         {/* static */}
</pageData.Provider>
```

Static chrome never waits: headers, card frames, card heads, `Riwayat` /
`Kelola` links, toolbars, pagination, action buttons, menus. If a part renders no
async value, it must not be inside anything that waits.

**A leaf reads its own slice** (`pageData.use("records")`) — no prop-drilling a
`Result`, no `useDay()` bundling three unrelated reads behind one spinner.

## 2. One key per independent read

`Home` used to answer "the day" with one `Effect.all` of four reads:

| key | read | who reads it |
|---|---|---|
| `today` | `record.count.summary(today)` | "Masuk hari ini", "Keluar hari ini" |
| `yesterday` | `record.count.summary(yesterday)` | their day-over-day delta |
| `records` | `record.get.byRange(today)` | the ledger rows |
| `debt` | `record.get.debt()` | "Utang berjalan" |
| `pockets` | `money.pockets.get.changes` (live) | the money card, admins only |

Four independent reads, four keys: the ledger no longer waits for the summaries,
and the pockets no longer queue behind the day at all. Split by **consumer**, not
by "these happen to load together".

Use `useAll` only when one visual unit genuinely needs several keys — `today` +
`yesterday`, because a delta without its comparison is a lie:

```tsx
const res = pageData.useAll("today", "yesterday");   // success only on the last
```

Prefer separate `use` calls when the values can land independently (see §3: the
amount can appear while the delta beside it pulses).

## 3. Fine-grained loading: pulse the value, never the card

The loading state of a stat card is **not** a skeleton card. It is the real card
with its values missing:

```
Masuk hari ini                            [icon tile]      ← static
Rp [▓▓▓▓▓▓▓▓]                                              ← "Rp" static, number pulses
[▓▓] transaksi   [◍] [▓▓▓]                                 ← "transaksi" static
```

Rules:

- **Keep every word, prefix and icon static.** `Rp` is part of the money format,
  not of the value. `transaksi` is a word, not data. The icon tile does not
  depend on the read.
- **Pulse in place, at the value's width**, with `SkeletonText` (an inline-block
  sized under the line box, so the line does not grow):
  ```tsx
  <span className={cn("text-normal font-semibold tabular-nums", tone)}>
    Rp {value === null ? <SkeletonText className="h-[0.7em] w-32" /> : value.toLocaleString("id-ID")}
  </span>
  ```
  Widths: `w-32` for an amount, `w-5` for a 1–3 digit count, `w-9` for a
  percentage, `size-4` for a glyph. An inline-block this short never expands the
  line box, which is what keeps the card's height fixed.
- **A data-dependent glyph pulses too.** The trend arrow's direction is data; a
  pinned up-arrow while loading would be a lie. Pulse the slot, not the shape.
- **Never replace the card with a skeleton** when its frame, label or wording is
  static — that is the whole layout shift (`z-Stats.tsx` before/after).
- **Separate keys can land separately.** `Amount` reads `today`, `Hint`'s delta
  reads `today` + `yesterday`; the amount shows while the comparison still
  pulses.
- **`Gate` is still right for a body**: a list, table or grid whose *content* is
  the thing loading has no static part to keep (`z-Ledger.tsx`, `z-Uang.tsx`).

`SkeletonText` lives beside `Skeleton` in `~/components/ui/skeleton.tsx`.
`Skeleton` (`div`) is for **blocks**; `SkeletonText` (`span`) for **values inside
a line**.

## 4. Reserve the space: `ROWS_FLOOR`

A list body shorter than its skeleton collapses the card the moment the rows
arrive. Give the region a floor, filled exactly by the skeleton:

```tsx
// z-Ledger.tsx
/** Four rows, big or small — a shape to tune here, not a measurement of the data. */
const ROWS_FLOOR = "min-h-[208px] small:min-h-[176px]";
/** One placeholder line, the height of a real row at either app size. */
const SKELETON_ROW = "flex min-h-[52px] small:min-h-[44px] items-center justify-between gap-3 px-4";
```

- **The floor belongs on the container that wraps the `Gate`, not inside the
  skeleton.** The space must exist *before* any placeholder is drawn (see §5).
  With it inside, the page is empty — and short — until the delay expires.
- **Skeleton rows must match real row height** at both app sizes
  (`52/44` for `text-normal` rows, `52/48` for `text-small`), and their count
  must fill the floor exactly (`4 × 52 = 208`).
- **A card's foot is chrome like its head.** Keep it outside the `Gate` and pulse
  only the number inside it, so its line is held open while the rows load
  (`z-Ledger.tsx` footer: `[pulse] transaksi`).
- The empty state and the loaded list share the same floor, so a quiet day does
  not shrink the card.

## 5. The 200 ms anti-flash window — yes, keep it

`Gate` holds its skeleton back for `delay = 200` ms (the same guard as `Loader`):
a local SQLite read answers in a few milliseconds, and a placeholder that appears
for two frames reads as jank, not as progress.

**The delay is only safe because the floor reserves the space.** Together:

| | fast read (< 200 ms) | slow read |
|---|---|---|
| floor reserved by the page | card already the right height | same |
| skeleton after 200 ms | never drawn | fades into the space that was already there |
| layout shift | none | none |

Hard-won rules:

- **Do not "fix" a layout shift by removing the delay.** That trades a flash for
  an empty box (it was tried; the user rejected it). Fix the shift with a floor
  (§4); keep the delay.
- `delay={0}` is for a region that reserves nothing of its own and must not show
  an empty box. `src/pages/Home` uses it nowhere.
- Both behaviours are pinned by tests — `the skeleton is held back, so a fast read
  never flashes it` and `delay={0} draws the skeleton on the first paint`
  (`src/components/page-data/page-data.test.tsx`). Changing a default without
  changing those tests is not a decision, it is a regression.

Inline value pulses (§3) are drawn immediately, on purpose: the line they sit in
is otherwise static (`Rp`, `transaksi`), so deferring them would put a hole in a
sentence. The anti-flash window applies to `Gate` skeletons, not to values.

## 6. Errors degrade one region

No throwing for a data failure. Each `Gate` renders an inline `role="alert"` by
default, or a page-authored slot:

```tsx
<Gate
  res={res}
  skeleton={<LedgerSkeleton />}
  error={(error) => <RegionError title="Gagal memuat transaksi hari ini" error={error} />}
>
  {({ data }) => <LedgerRows records={data} />}
</Gate>
```

`RegionError` (`src/pages/Home/z-Error.tsx`) is the region-sized notice. The
page-level `ErrorBoundary` stays as last resort for defects, not for typed
failures. The old per-region `createErrorBoundary` wrappers are unnecessary once
every read is a key.

A key that never arrived (`init`) is a skeleton; a key that failed is an error
card; the rest of the page is unaffected.

## 7. Writes: `useMutation` + `refetching`

```ts
const save = pageData.useMutation(service.product.set.name, { refetch: ["products"] });
await save.mutate({ id, name });     // -> Either<A, E>
// save.pending     this write's own round-trip (buttons)
// save.error       typed E | null
// save.refetching  true across the write *and* the refetch that follows
```

- From the moment it starts, the named keys keep their value and carry
  `refetching: true`.
- On success: an `Effect` (read-once) key is re-read and its flag clears with the
  new value; a `Stream` (live) key just clears — the service already pushed it.
- On a typed failure: the flag clears and **nothing** is re-read; the caller gets
  `Left`. On a defect: the flag clears and the defect is rethrown.
- Keys the mutation does not name never go stale.

**The pattern prescribes no look for staleness.** `refetching` is the only
signal; the component decides — dim, shimmer, spinner, a "menyegarkan" chip, or
nothing. A widget must never go busy for a key it does not read.
`src/pages/Dev/PageData/z-Stale.tsx` is an example of two treatments (page-local,
not a pattern preset).

## 8. Params: `deps`

```tsx
<pageData.Provider sources={sources} deps={[dayStart, role]}>
```

When a dependency changes, every key keeps its data (`refetching`) and
resubscribes — a `:id` change, a filter, midnight rolling over. Pass primitives;
memoize the `sources` object (`useMemo`) so a new identity is only produced when
the values change.

For a read that must re-run when a service write happens (a revision counter),
put it inside the source instead, so only that key re-reads:

```ts
// day.ts — the counter replays its current value on subscribe, so the first
// emission is also the first read; every commit re-reads.
const onEachCommit = <A>(read: Effect.Effect<A, RecordError>) =>
  service.record.get.revision.pipe(Stream.mapEffect(() => read));
```

## 9. Admin-only keys

A key that some roles must not read is not registered for them, rather than read
and hidden:

```tsx
pockets: isAdmin ? service.money.pockets.get.changes : Stream.empty,
```

`Stream.empty` completes without emitting, so no query runs and the key stays
`init`. The card that reads it is rendered only for admins.

## 10. Migration recipe

1. List every read the page performs and who consumes it → one key per consumer
   group (§2). Do not keep a `useX()` hook that bundles them.
2. Write `data.ts`: `createPageData<Map, ErrorUnion>("PageName")`. Export the
   error union. Add `PageName.Provider sources deps`.
3. Move the reads into `day.ts`-style source builders: `Stream` for live service
   state, `Effect` for read-once; wrap revision-driven reads with `mapEffect`.
4. In `page.tsx`, register all sources in one memo; render static chrome outside
   anything that waits.
5. For each region:
   - static wording + async values → render the frame, `SkeletonText` the values
     (§3);
   - a list/table body → frame + head + foot outside, `Gate` + floor for the body
     (§4).
6. Pass an `error` slot per `Gate`; delete per-region boundaries.
7. Keep the 200 ms delay; verify the card does not move between skeleton and
   data.
8. Delete the old hooks/loader (`use-day.ts`, `use-pockets.ts`, `z-Day.tsx`).
9. Verify: `npx tsc --noEmit`, `npx eslint <touched paths>`, `bun test`.
   `e2e/home.e2e.ts` is the e2e reference for the regions and their order.

## 11. Review checklist

- [ ] No `Loader`/`useQuery` above a region — each region reads its own key.
- [ ] Static chrome renders before any data: frames, heads, action links, menus.
- [ ] No whole-card skeleton where the card's frame and words are static.
- [ ] `Rp`, nouns, labels and icon tiles stay on screen while loading.
- [ ] Every `Gate` body has a floor; skeleton row count × row height = floor,
      in both `big` and `small` sizes.
- [ ] Skeleton is held back 200 ms; the floor — not the skeleton — reserves the
      space.
- [ ] The card's height is identical before and after the data arrives (eyeball
      it with a slow read, then revert the delay).
- [ ] A failed key shows a region error; the rest of the page is intact.
- [ ] Writes name their keys; only `refetching` is exposed, no styling imposed.
- [ ] Admin-only data is not subscribed for other roles.

## Pitfalls seen in review

| Symptom | Cause | Fix |
|---|---|---|
| Card is empty, then a skeleton appears | skeleton held back, nothing reserved | floor on the wrapper (§4), keep the delay (§5) |
| Card jumps when data lands | skeleton height ≠ content height | match row heights and counts to the floor |
| Amount appears but the delta disappears | bundled keys, or a card-level skeleton | separate keys + inline pulses (§3) |
| The whole page blinks on navigation | one top-level `Loader` left in place | per-region keys (§1) |
| Loader flashes for 10 ms on every visit | anti-flash delay removed | restore `delay = 200` (§5) |
| Money card waits for the day | `pockets` read below the day's `Gate` | register both sources on the page |
