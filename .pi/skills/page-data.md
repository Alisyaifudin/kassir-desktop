---
name: page-data
description: How to build a page's async data with createPageData and pageData.Gate — one key per independent read, the read at the leaf that renders the value, fine-grained value placeholders (pulse the value, never swap the card), reserved card heights (ROWS_FLOOR) so loading never shifts layout, the 200 ms anti-flash window, frames that read state via useFrame, mutations with refetching/stale, Provider deps for params, and error isolation. Use whenever creating a page under src/pages/, adding async data to a component, migrating a `<Gate res={…}>` call site, wiring a write that changes page data, or auditing a page that blocks on a top-level Loader. src/pages/Home (dashboard, gates both granularities) and src/pages/Setting (form panels) are the reference implementations; page-data-migration.md is the refactor recipe.
---

# Page data — `~/components/page-data`

Replaces the `useStream` + `<Loader>` shape where one result gates the whole tree.

```
page.tsx   one Provider, every source registered once, in parallel
data.ts    the typed contract: HomeData + HomeError
day.ts     the reads, one per key (Stream = live, Effect = read once)
z-*.tsx    the leaf that renders a value gates it, with its own placeholder
```

One component gates everything: **`pageData.Gate`**. It takes the **keys** its
children read, so it cannot gate something other than what it guards, and its
children cannot read a key it did not declare.

```tsx
// a region whose body is the thing loading
<pageData.Gate keys={["records"]} pulse={<LedgerSkeleton />} error={(e) => <RegionError … />}>
  {({ records }) => <LedgerRows records={records} />}
</pageData.Gate>

// a value inside a static line: same component, delay 0, the card owns the error
<pageData.Gate keys={["today"]} delay={0} pulse={<SkeletonText className="h-[0.7em] w-32" />} error={null}>
  {({ today }) => today[mode].total.toLocaleString("id-ID")}
</pageData.Gate>
```

## Two rules this pattern is judged on

1. **Fine-grained loading.** Only the values pulse — never the card around them.
   Which means the read happens at the leaf that renders the value, not in a
   parent that threads `number | null` down.
2. **Reserved space.** A card with async data holds its height from the first
   frame, so the swap from placeholder to data moves nothing.

Getting either wrong is a bug, not a preference. Both are explained below with
the mistakes that were made first.

---

## 1. Gate the region, not the page — and read at the leaf

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

**Neither does a screen whose content is static data.** The settings section
imports its shell and *every* screen eagerly (`pages/Setting/*/index.tsx`): the
section names (`Akun`, `Toko`, `Sistem`), the five rows, their descriptions and
each form's labels come from `util-nav.ts` and the markup, while the values load
through `page-data` inside. A `React.lazy` screen behind
`<Suspense fallback={<LoadingScreen/>}>` only hid that static half behind a
page-shaped skeleton — the same mistake as a top-level `Loader`, in another
costume. Laziness there is about *chunks*, not data, so check what the chunk
actually costs first: `Printer`'s test print pulled `pdf-lib` (~2 MB) into the
route, so the receipt module is now a dynamic import at click time
(`Printer/util-program-print.ts`) and the eager screen costs nothing.

### Consume the data only where it is rendered

A gate at the top of a card that hands `number | null` down is the same mistake
one level smaller: the parent has to encode "still loading" per child, and every
child has to interpret it.

```tsx
// ✗ one read, three slots to feed, two nullables to combine, a null protocol
const today = pageData.use("today");
const yesterday = pageData.use("yesterday");
const current = today.type === "success" ? today.data[mode] : null;
const previous = yesterday.type === "success" ? yesterday.data[mode] : null;
<CardFrame busy={current === null || previous === null}>
  <Amount value={current === null ? null : current.total} />
  <Hint count={current === null ? null : current.count} delta={…} />
</CardFrame>

// ✓ the frame reads *state*; each number reads its own key where it is drawn
function TodayStat({ mode, label, icon, tile }) {
  const frame = pageData.useFrame(["today", "yesterday"]);
  return (
    <CardFrame label={label} icon={icon} tile={tile} busy={frame.status === "pending"}>
      <Show value={frame.error} fallback={<><TodayAmount mode={mode} /><TodayHint mode={mode} /></>}>
        {(error) => <RegionError title="Gagal memuat ringkasan" error={error} />}
      </Show>
    </CardFrame>
  );
}
```

`frame.status` is one word; `frame.error` is the card's one error. Neither is a
value, so the frame cannot display a wrong or missing number.

**A frame that needs a value** (a link that only exists while something is owed, a
destructive tone) has two honest options: make the chrome static (`Home`'s debt
card always links to `/debt`, like the money card links to `/money`) or gate the
chrome itself. Do **not** read with `pageData.use` at the top of the card to get
it — that is the pattern this file is trying to retire.

**A leaf reads its own slice** — `<pageData.Gate keys={[…]}>{value => …}</pageData.Gate>`,
no prop-drilling of a `Result`, no `useDay()` bundling three unrelated reads
behind one spinner.

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

Then split again by **landing**: a value that could answer earlier gets its own
gate with its own narrower key list. `TodayHint` is two gates — `keys={["today"]}`
for the count and `keys={["today","yesterday"]}` for the comparison — so the count
appears while the delta still pulses. **Never declare a superset** for a whole
card: that makes every value wait for the slowest one, which is the coarse read
again in a new costume.

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
- **Pulse in place, at the value's width**, with a `SkeletonText` passed as the
  gate's `pulse` (an inline-block sized under the line box, so the line does not
  grow):
  ```tsx
  <span className={cn("text-normal font-semibold tabular-nums", tone)}>
    Rp{" "}
    <pageData.Gate keys={["today"]} delay={0} pulse={<SkeletonText className="h-[0.7em] w-32" />} error={null}>
      {({ today }) => today.incoming.total.toLocaleString("id-ID")}
    </pageData.Gate>
  </span>
  ```
  Widths: `w-32` for an amount, `w-5` for a 1–3 digit count, `w-9` for a
  percentage, `size-4` for a glyph. An inline-block this short never expands the
  line box, which is what keeps the card's height fixed.
  **`delay={0}` and `error={null}`** on every value gate — see §5 and §6.
- **A data-dependent glyph pulses too.** The trend arrow's direction is data; a
  pinned up-arrow while loading would be a lie. Pulse the slot, not the shape.
- **Never replace the card with a skeleton** when its frame, label or wording is
  static — that is the whole layout shift (`z-Stats.tsx` before/after).
- **Separate keys can land separately** (§2). The amount reads `today`; the
  count reads `today`; the comparison reads `today` + `yesterday`; the amount and
  the count show while the comparison still pulses.
- **A body gate is still right**: a list, table or grid whose *content* is the
  thing loading has no static part to keep (`z-Ledger.tsx`, `z-Uang.tsx`) — same
  component, default `delay`, a region-sized `pulse`.
- **A word can be a value.** "Sisa" and "Kembalian" are the same slot with two
  readings, chosen by the data — so the *label* pulses, not just the number
  (`Pos/z-Bottom.tsx`). Same for a tab title, a status word, a mode name.
- **A control is not a text value.** Render the real control disabled and empty
  inside `PendingValue` (`pages/Setting/z-PendingValue.tsx`): its border, padding,
  chevron and height are the control's own, and only the text inside pulses. A
  checkbox pulses as a box of the checkbox's size — an empty unchecked box would
  be a claim.
- **Hoist what the form does not own.** `Setting/Printer` keeps the label and the
  description of each field outside the gate, so only the control slot waits.
  Where the form library owns the label (`Setting/Shop`, TanStack Form), the
  skeleton renders the same labels from one `LABELS` map, so the two states can
  never disagree about which field is which.
- **`null` inside a value is data.** `delta()` returning `null` means "answered,
  and there is no base to compare with"; a pocket's `latest === null` means
  "empty". The gate carries "not loaded", so a real `null` keeps its meaning.
  Never write `value ?? <Pulse />` or `<Show value={value} fallback={<Pulse />} />`
  to mean loading — that collapses two different absences onto one channel.

`SkeletonText` lives beside `Skeleton` in `~/components/ui/skeleton.tsx`.
`Skeleton` (`div`) is for **blocks**; `SkeletonText` (`span`) for **values inside
a line**.

## 4. Reserve the space: `ROWS_FLOOR`

A list body shorter than its skeleton collapses the card the moment the rows
arrive. Give the region a floor, filled exactly by the skeleton:

```tsx
// z-Ledger.tsx
/** Six rows, big or small — a shape to tune here, not a measurement of the data. */
const ROWS_FLOOR = "min-h-[275px] small:min-h-[176px]";
/** One placeholder line, the height of a real row at either app size. */
const SKELETON_ROW = "flex min-h-[52px] small:min-h-[44px] items-center justify-between gap-3 px-4";
```

- **The floor belongs on the container that wraps the gate, not inside the
  `pulse`.** The space must exist *before* any placeholder is drawn (see §5).
  With it inside, the page is empty — and short — until the delay expires.
- **Skeleton rows must match real row height** at both app sizes
  (`52/44` for `text-normal` rows, `52/48` for `text-small`). The floor, the row
  height and the skeleton's row count are **one tuned trio**: `Ledger`'s floor is
  `275/176`, its rows are `52/44`, and its skeleton draws four of them — enough
  that a fast read shows no grey and a slow one fills the reserved height. Change
  any one of the three and re-measure, or the card moves between its shortest and
  its fullest state.
- **A card's foot is chrome like its head.** Keep it outside the body gate and
  pulse only the number inside it, so its line is held open while the rows load
  (`z-Ledger.tsx` footer: a `delay={0}` gate around the count, `transaksi`
  outside it).
- The empty state and the loaded list share the same floor, so a quiet day does
  not shrink the card.

## 5. The 200 ms anti-flash window — yes, keep it

`pageData.Gate` holds its `pulse` back for `delay = 200` ms (the same guard as
`Loader`): a local SQLite read answers in a few milliseconds, and a placeholder
that appears for two frames reads as jank, not as progress.

**The delay is only safe because the floor reserves the space.** Together:

| | fast read (< 200 ms) | slow read |
|---|---|---|
| floor reserved by the page | card already the right height | same |
| pulse after 200 ms | never drawn | fades into the space that was already there |
| layout shift | none | none |

Hard-won rules:

- **Do not "fix" a layout shift by removing the delay.** That trades a flash for
  an empty box (it was tried; the user rejected it). Fix the shift with a floor
  (§4); keep the delay.
- `delay={0}` is for a **value inside a line** (§3) — nothing of its own is
  reserved, and an empty slot would put a hole in a sentence. A region keeps the
  default.
- A pending region's placeholder is **not remounted** when one of its keys
  arrives: the gate renders the same node until every declared key has settled.
  That is why a three-key region blinks once, not three times — and it is pinned
  by `the first key arriving does not remount the pulse`
  (`src/components/page-data/gate.test.tsx`).
- Both behaviours are pinned by tests — `the pulse is held back, so a fast region
  never flashes it` and `the body renders only after every declared key has
  answered` (which asserts a `delay={0}` pulse is on the very first frame) in
  `src/components/page-data/gate.test.tsx`, plus `delay={0} draws the skeleton on
  the first paint` in `page-data.test.tsx` for the deprecated component. Changing
  a default without changing those tests is not a decision, it is a regression.

Inline value pulses (§3) are drawn immediately, on purpose: the line they sit in
is otherwise static (`Rp`, `transaksi`), so deferring them would put a hole in a
sentence. The anti-flash window applies to region-shaped pulses, not to values.

**When the placeholder is itself the shape** — a form: same labels, same
controls, same gaps — no `min-h` can stay true across app sizes. Mount the
placeholder at once and keep it invisible for the window instead:

```tsx
<pageData.Gate
  keys={["info"]}
  delay={0}
  pulse={<ReservedSkeleton className="flex flex-col gap-4">…</ReservedSkeleton>}
  error={(e) => <RegionError … />}
>
  {({ info }) => <InfoForm info={info} />}
</pageData.Gate>
```

`ReservedSkeleton` (`pages/Setting/z-ReservedSkeleton.tsx`) renders its children
transparent for `useDelayedFlag(true)`'s 200 ms. The space is taken from the first
frame, nothing grey is drawn for a fast read, and a slow read fades the
placeholder in without moving anything. Its `className` must reproduce the layout
the real children will have (the panel's gaps), or the reservation is a lie.

**When every word of the form is static, do not hide the form at all.** A
product's edit form is the case: which fields exist does not depend on the read,
so the real controls are drawn empty and disabled with their own box painted —
`PendingInput` / `PendingNumber` / `PendingTextarea` / `PendingCombobox` in
`pages/Product/Form/z-Pending.tsx` — and the labels, hints, placeholders and row
titles come from the same constants the form reads (`INFO_LABELS`,
`LISTING_ROW`, `STOCK_ROW`, `PROPERTY_ROW`, `NAMES_ROW`). The box *is* the
placeholder, so it is the control's own size — an input is input-tall, `rows={3}`
is three lines, a combobox keeps its chevron — at both app sizes, with no px of
ours in it. Nothing is hidden for 200 ms: the form is on screen from the first
frame and only the values arrive. `pages/Product/Detail/Info` is the worked
example; keep `ReservedSkeleton` for the case it was made for, a shape (row
counts, panel gaps) that genuinely cannot be known.

## 6. Errors degrade one region

No throwing for a data failure. A gate renders an inline `role="alert"` by
default — with its own retry — or a page-authored slot:

```tsx
<pageData.Gate
  keys={["records"]}
  pulse={<LedgerSkeleton />}
  error={(error) => <RegionError title="Gagal memuat transaksi hari ini" error={error} />}
>
  {({ records }) => <LedgerRows records={records} />}
</pageData.Gate>
```

- The `error` slot is typed with the page's error union — no cast, no `unknown`.
- Omit `error` and the gate renders `InlineError` with a **“Coba lagi” button
  wired to `refresh(keys)`**; you never wire a retry by hand.
- Pass `error={null}` on a **value** gate: an inline slot has no error treatment
  of its own. The card reads `useFrame(keys).error` and shows one error for the
  whole card. Two error treatments for one card is a bug.
- **Bad news does not wait for a slow key**: the first failure is rendered
  immediately, even while another declared key is still pending.

`RegionError` (`src/pages/Home/z-Error.tsx`) is the region-sized notice. The
page-level `ErrorBoundary` stays as last resort for defects, not for typed
failures. The old per-region `createErrorBoundary` wrappers are unnecessary once
every read is a key.

A key that never arrived (`init`) is a placeholder; a key that failed is an error
card; the rest of the page is unaffected.

## 7. Writes: `useMutation` + `refetching` + `stale`

```ts
const save = pageData.useMutation(service.product.set.name, { refetch: ["products"] });
await save.mutate({ id, name });     // -> Either<A, E>
// save.pending     this write's own round-trip (buttons)
// save.error       typed E | null
// save.refetching  true across the write *and* the refetch that follows
// save.stale       true when the write landed but the refetch behind it lost
```

- From the moment it starts, the named keys keep their value and carry
  `refetching: true` — so a gate never re-enters for a write, and the pulse does
  not come back.
- On success: an `Effect` (read-once) key is re-read and its flag clears with the
  new value; a `Stream` (live) key just clears — the service already pushed it.
  **A live key is never re-read by a mutation**, so `stale` can only come from a
  read-once key.
- On a typed failure: the flag clears and **nothing** is re-read; the caller gets
  `Left`. On a defect: the flag clears and the defect is rethrown.
- On a read that fails after a successful write: the key keeps its old value,
  carries `failure`, and `save.stale` / `useStatus(key) === "stale"` say so. This
  is the third outcome — saved, but the screen is showing the pre-write value.
- Keys the mutation does not name never go stale.

**The pattern prescribes no look for staleness.** `refetching` and `stale` are the
signals; the component decides — dim, shimmer, spinner, a "menyegarkan" chip, or
nothing. A widget must never go busy for a key it does not read.
`src/pages/Dev/PageData/z-Stale.tsx` is an example of two treatments (page-local,
not a pattern preset); `z-Gate.tsx` shows the same through gates.

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
`pending` forever. The card that reads it is rendered only for admins — a gate on
a key nobody registered would pulse forever.

## 10. Migration

**`page-data-migration.md` is the recipe** — one file at a time, with the before/
after for every shape (`use` → `keys`, `useAll` → several values or several
gates, `<Gate res>` → `<pageData.Gate>`, inline values, frames, `Show`).

The summary, for a page that is still on the old API:

1. List every read and who consumes it → one key per consumer group (§2).
2. Write `data.ts`: `createPageData<Map, ErrorUnion>("PageName")`. Export the
   error union. Add `PageName.Provider sources deps`.
3. Move the reads into `day.ts`-style source builders: `Stream` for live service
   state, `Effect` for read-once; wrap revision-driven reads with `mapEffect`.
4. In `page.tsx`, register all sources in one memo; render static chrome outside
   anything that waits.
5. For each region: body → one `pageData.Gate` + floor (§4); static wording with
   async values → the frame plus one value gate per number (§3).
6. Each card's frame reads `useFrame(keys)`; each value gate passes
   `error={null}` and the card owns the error (§6).
7. Keep the 200 ms delay on regions; verify the card does not move between pulse
   and data.
8. Delete the old hooks/loader (`use-day.ts`, `use-pockets.ts`, `z-Day.tsx`) and
   any `number | null` prop that a child interpreted as loading.
9. Verify: `npx tsc --noEmit`, `npx eslint <touched paths>`, `bun test`.
   `e2e/home.e2e.ts` is the e2e reference for the regions and their order.

### Second reference — `src/pages/Setting` (forms)

| file | what it shows |
|---|---|
| `Shop/data.ts` | one key for a value written whole (`info.set`) — do not split an object a single write owns |
| `Shop/page.tsx` | panel head and field labels static; `delay={0}` + `ReservedSkeleton`; error slot in the panel |
| `Shop/z-Info.tsx` | `LABELS` shared by the form and its skeleton; the save button drawn in both |
| `Printer/data.ts` | two keys with different freshness: stored config (live stream) vs hardware list (read once) |
| `Printer/z-SelectPrinter.tsx` | label/description outside the gate; the control slot is the only thing pending |
| `z-PendingValue.tsx` | a control holding its own box with a pulse inside |
| `z-ReservedSkeleton.tsx` | invisible reservation for a shape the page cannot measure |
| `Log/page.tsx` | the console box is chrome; only the lines wait (default delay, space reserved by the layout) |
| `*/index.tsx` | every screen in the section imported eagerly — no page-level `Suspense` over static heads and labels |
| `Printer/util-program-print.ts` | the 2 MB receipt dependency loaded at click time, not with the screen |

(`Setting` still calls `<Gate res={pageData.use(…)}>`; read its layout lessons,
not its call shape, until it migrates.)

## 11. Review checklist

- [ ] No `Loader`/`useQuery` above a region — each region reads its own key.
- [ ] **No `pageData.use` above a leaf**: the component that renders a value is
      the one that gates it. No `number | null` / `Result` props threaded down.
- [ ] Each frame uses `useFrame(keys)` for `busy`/`error`, not a value read.
- [ ] One gate per independently landing value; no gate declares a superset of
      what its children need.
- [ ] Static chrome renders before any data: frames, heads, action links, menus.
- [ ] No whole-card skeleton where the card's frame and words are static.
- [ ] `Rp`, nouns, labels and icon tiles stay on screen while loading.
- [ ] Every body gate has a floor on its wrapper; skeleton row count × row height
      = floor, in both `big` and `small` sizes.
- [ ] The pulse is held back 200 ms on bodies, `delay={0}` on values; the floor —
      not the pulse — reserves the space.
- [ ] The card's height is identical before and after the data arrives (eyeball
      it with a slow read, then revert the delay).
- [ ] A failed key shows one region error (or the gate's default retry), and the
      rest of the page is intact.
- [ ] A refetch does not blank the region and does not bring the pulse back.
- [ ] Writes name their keys; `refetching`/`stale` are the only signals, no
      styling imposed.
- [ ] No `value ?? <placeholder>` / `<Show value={x} fallback={<placeholder/>}>`
      where `null` is also data.
- [ ] Admin-only data is not subscribed for other roles.
- [ ] The page registry has `cache: true`, every key is a live stream, an
      `Effect` that nothing invalidates is in `skip`, and a screen that writes from
      a seeded key waits for the confirmation (§14).

## Pitfalls seen in review

| Symptom | Cause | Fix |
|---|---|---|
| Card is empty, then a pulse appears | pulse held back, nothing reserved | floor on the wrapper (§4), keep the delay (§5) |
| Card jumps when data lands | placeholder height ≠ content height | match row heights and counts to the floor |
| Amount appears but the delta disappears | bundled keys, or a card-level placeholder | one gate per landing value (§2, §3) |
| The whole card waits for its slowest number | a gate declared a superset of keys | narrow the key list to what that value reads (§2) |
| The whole page blinks on navigation | one top-level `Loader` left in place | per-region keys (§1) |
| A static list/section shows a page skeleton | the hub/screens are `React.lazy` behind `Suspense` | import them eagerly; lazy the heavy dependency instead (§1) |
| Placeholder flashes for 10 ms on every visit | anti-flash delay removed | restore `delay = 200` (§5) |
| Region blinks once per key | the placeholder is remounted as keys arrive | one gate for the set, retried when the whole set settles (§5) |
| Form panel grows when the form lands | shape-only placeholder was delayed with no space reserved | `delay={0}` + `ReservedSkeleton` (§5) |
| Input flashes an empty box then text | value rendered without the control | `PendingValue` around the real disabled control (§3) |
| A value pulses forever while its card shows data | `use`/`useFrame` read at the top gate the card, not the value | move the read into the leaf's gate (§1) |
| Empty pocket / no-delta case pulses | `null`-as-loading (`??`, `<Show value>` fallback) | keep data-`null` in the value; the gate carries absence (§3) |
| One card shows two error notices | `error` slot on the values *and* on the frame | `error={null}` on value gates; the card owns it (§6) |
| Money card waits for the day | `pockets` gated below the day's region | register both sources on the page, one gate each |

## 12. Where this is applied (keep it current)

Every page under `src/pages` reads through `pageData.Gate` — the keys-first gate,
`useFrame` for a frame's `busy`/`error`, and `useStatus` for a key's word. The
whole sweep landed together; the shapes below are the ones to copy.

| page | keys | notes |
|---|---|---|
| `Home` | `today`, `yesterday`, `debt`, `records`, `pockets` | the reference for both granularities: `useFrame` per card, one gate per value with `delay={0}`, ledger body + footer count/`Lihat N lagi` |
| `Product` | `products` | body gate; `Rows` derives filter/page; the filter popover and the pager each gate their own numbers |
| `Product/Detail` (+ `Info`, `Image`) | `products` (`changesFull`) | header = one gate with four states (waiting / failed / missing / found); `Info` gates the whole tab and draws the *same* `Body product={undefined}` as its pulse |
| `Record` | `records` (day + query as `deps`) | left list gated; `busy` from `useStatus("records") === "refreshing"`; right pane has its own registry |
| `Record/Item` | `record`, `info`, `socials` | tab strip static, one gate per tab; the receipt gates its two keys together |
| `Record/z-Detail` | `record` | its own registry over `../Item/data`'s `recordSource`, `deps=[recordId]` so selecting another record keeps the previous preview |
| `Record/Search` | `results` | Provider lives in `Results` (the limit is a local counter): `deps=[start, end, mode, query, limit]`, `keepPrevious` for free |
| `Money` | `pockets` | heading + add button static |
| `Money/History` | `pockets`, `entries` | **nested gates**: the pocket gates the screen (it decides `NotFound` and the table's column shape), the ledger gates itself inside it with `delay={0}` |
| `Debt` | `records` | source re-reads on the record revision |
| `Extra`, `Extra/Detail` | `extras` | one key, whole catalog; the detail finds its row in the same answer |
| `Cashier`, `Customer`, `Method`, `Social` | one list key each | static heads, inline failure line |
| `Setting/{Shop,Printer,Log}` | `info` / `printer`+`printers` / `lines` | the reference forms: `PendingValue` + `ReservedSkeleton`, `delay={0}` |
| `Home/z-Uang` | `pockets` | single-key body |
| `Dev/PageData` | playground keys | source kinds, granularities, `stale`, write+`stale` |

`pageData.use` survives in exactly one family — **the cart screens, where the read
is an argument to a hook rather than a value to draw**:

| file | why it must read the `Result` |
|---|---|
| `Pos/page`, `Restock/page` | `drafts`/`extras` feed `useCartScreen`; the cart *works* while the read is in flight, so there is nothing to gate — and `ready` stays the literal `success && refetching !== true`, because a key that kept its value after a failed refresh is still readable |
| `Pos/z-Bottom` | `methods` → `catalog: null` makes the strip draw placeholder rows *and* keep the retry line under it; a gate would replace the strip and lose the retry |
| `Pos/Draft/z-Customer` | a failed read must keep the field and fall back to `[]` (the comment says what broke when it did not) |
| `Restock/Draft/{z-Payment,z-Supplier}` | same two shapes: an overlay control with its own retry |

Deliberately still on `Loader`/`LoaderMany`, with reasons:

- **Interactive cart strips** (`Pos/z-Bottom`, `Transaction/z-Bottom`,
  `Restock/Draft/z-Payment`): their retry is a *remount* (`key={attempt}`) that
  re-subscribes the stream, and the failing read is a small control under a total
  that is already on screen. Converting them to a gate would drop that retry.
  If one is migrated, keep the retry by giving the gate an `error` slot whose
  button calls `pageData.useRefresh()` — do not silently lose it.
- **Cart screens** (`Pos`, `Restock`, `Transaction`): the draft *is* the screen.
  Their skeletons are shape-matched to the whole grid, which is honest; the
  fine-grained rule applies to the static chrome around them, which is already
  outside any loader (tabs, totals, buttons).
- **Dialog / popover loads** (`Record/z-Header/FilterDialog`,
  `Record/Item/.../z-Method`): a control that lives inside an overlay; the
  placeholder is shaped like the control and the overlay itself is static.
- **Analytics pages**: each page's *body* is the analysis (summary + charts) and
  the rail/range controls live in the layout above it, so the gate is already at
  the right boundary. Their `AnalyticsErrorFallback` is an inline region notice
  (not a page takeover), so moving them to a gate would be cosmetic.
- **`Dev/PageCache`** (the cache lab): its subject is the `Result` itself —
  `useFirstPaint` asks "were you already data at mount?" — so it keeps the
  `@deprecated` prop-driven `Gate`. It is the last one; every real page is
  migrated.
- **Legacy `useQuery`/`useStream` sub-components** (`Record/z-Detail/z-Payments`,
  `Record/z-Search`'s header, `Transaction`, `Login`, the upload dialogs): they
  are `Loader` reads, not `page-data` keys. Adopt `createPageData` when the screen
  is touched for another reason, not as a Gate swap.

## 13. Skeleton dimensions are measured, not guessed

A placeholder is wrong in four separate ways, and each is a decision:

1. **Count** — how many places to hold (two or three tabs, three rows).
2. **Box** — full width for a row band, a fixed width for a tab or a chip, a
   `max-w` for a value inside a line.
3. **Height at both app sizes** — `h-[X] small:h-[Y]`, from the real element, not
   from a default like `h-4` or `h-11`.
4. **Radius** — the shape of what it stands in for, *not* the primitive's default.

Guessing is what produces "the skeleton doesn't look like the thing": a 44px row
band standing in for a 141px cart line, a 112px tab for a 200px one.

### Radius carries meaning

| standing in for | radius | example |
|---|---|---|
| a **row** of a divided list (full width) | `rounded-none` | cart line `h-[141px] rounded-none w-full small:h-[113px]` |
| a **tab** (rounded on top only) | `rounded-t-md` | `h-[40px] w-[200px] rounded-t-md small:h-[37px] small:w-[106px]` |
| a **card, thumbnail, control** | keep `rounded-md` | method row `h-[70px] w-full small:h-[56px]` |
| a **round chip** (avatar, kbd) | `rounded-full` | `size-8 rounded-full` in `CartLoading` |
| a **line of text** | `SkeletonText`'s `rounded-sm`, or `rounded-none` for a full-width band | payment strip `w-full max-w-[120px] rounded-none` |

A square row band inside a divided list reads as a row; a `rounded-md` one reads
as a floating card and makes the list look like a stack of chips.

### Measured reference — the cart screens (big / small)

| element | box | radius |
|---|---|---|
| cart tab | `w-[200px] h-[40px]` / `w-[106px] h-[37px]` | `rounded-t-md` |
| cart line | `w-full h-[141px]` / `h-[113px]` | `rounded-none` |
| extras row | same as a cart line | `rounded-none` |
| payment method row | `w-full h-[70px]` / `h-[56px]` | `rounded-md` (default) |
| payment rounding band | `w-full h-[40px]` / `h-[30px]` | `rounded-none` |
| change row amount | `max-w-[400px] h-[80px]` / `max-w-[300px] h-[70px]` | default |
| grand total | `w-[400px] h-[120px]` / `w-[300px] h-[100px]` | `rounded-md` (default) |

Notes from those numbers:

- **A big numeral is a block, not an inline pulse.** `text-grand-total` is ~102px
  tall, so the grand total is a `Skeleton` sized to the line, not a
  `SkeletonText`.
- **A tall glyph needs a tall pulse.** `text-change` is larger than body text, so
  its pulse is `h-[80px]`/`h-[70px]`, not `0.8em`.
- **Every dimension has a `small:` twin.** The app's size class changes the type
  scale, so a single px value is only ever right in one mode.

### How to measure (10 seconds, no guessing)

In a Playwright page after the data has arrived:

```js
const r = (el) => { const b = el.getBoundingClientRect(); return `${Math.round(b.width)}x${Math.round(b.height)}` };
r(document.querySelector('[role="tab"]'));            // the tab
r(document.querySelector('[data-testid="cart-line"]')); // the row
// then, for the small variants:
document.body.classList.add("small");
```

Take both readings **after** any entrance animation settles (`ListingCard` animates
height from 0 over 150 ms), or the first number will be the animation, not the box.

### Placeholders are decorative

Rows and tabs held for data are `aria-hidden`: they are not content, must not be
counted as tabs/rows by a screen reader, and must not enter a grid's keyboard
model (the cart's arrow keys are computed from real rows).

## 14. Cache — `cache: true` on every page

`pageCache` (`~/components/page-data/z-cache.ts`) keeps each key's last answer in
a **module-level, memory-only** store. A return visit paints that answer on the
first frame instead of a placeholder; whether it is then re-read depends on one
rule:

> **A value is trusted until something says it moved.** No TTL. A write that
> names its keys (`useMutation`), an `invalidate(tag)`, or a page's own
> `invalidate(key)` is the only thing that makes a key re-read.

**Every page registry opts in.** `src/components/page-data/registry-cache.test.ts`
fails if one does not, so a new page cannot quietly arrive without it.

```ts
export const pageData = createPageData<PosData, PosError>("PosPage", { cache: true });
```

### What makes that safe here: every key is a live stream

A seeded `Stream` is painted **flagged `refetching`**, and the subscription's
first emission — the `SubscriptionRef`'s replay, or the revision counter's
current value — replaces it in milliseconds. So the store is never the last word;
it only spares the first paint. This is why no write path needs to remember to
invalidate anything: the services push, and a pushed value is written back to the
store as it arrives.

That property is also the condition. **Cache only keys whose source is a live
stream.** Before opting a page in, answer four questions:

1. **Is every key a `Stream`?** A `Stream.tick`/`scan` restarts on subscribe, so a
   cached snapshot is painted and then contradicted — never cache a derived
   stream. (`Dev/PageData` stays off for exactly this reason: its `beat` is
   `Stream.tick | scan`.)
2. **Is any key an `Effect` that nothing invalidates?** Then it must be `skip`ped,
   or it will never re-read. `Setting/Printer` caches `printer` (live) and skips
   `printers` (the system's printer list, read once): a seeded hardware list would
   never show a printer plugged in since the last visit.
3. **Does any screen *write* from a seeded key?** Then its `ready` must wait for
   the confirmation — `success && refetching !== true`, not `useStatus === "ready"`
   (a value that outlived a failed refresh is still readable). Pos and Restock
   both open a cart when their draft list is empty, so both wait.
4. **Does `deps` isolate the answer?** A day, a range, a query, a role: anything
   that changes *which* question is being asked belongs in `deps`, or a return
   visit will paint another question's answer. `Home` carries `[dayStart, role]`,
   `Record` `[dayStart, dayEnd, query]`, `Money/History` `[pocketId, start, end]`,
   `Record/Search` `[start, end, mode, query, limit]`, `Record`/`Record/z-Detail`
   their ids. This is also what makes "go back to a filter you already saw"
   instant without ever showing another role's answer.

What the provider does differently:

| source | cached? | on mount |
|---|---|---|
| `Effect` (read once) | yes | paints the entry; **skips the read** while it is fresh. A fresh seed is *confirmed* — it is not flagged |
| `Stream` (live) | yes | paints the entry **flagged `refetching`**, then subscribes — a live source is the truth, not a copy, and its first emission clears the flag |
| any key in `skip` | no | exactly as before |

Rules that were learned the hard way (the playground is `/dev/page-cache`):

- **Never cache a derived stream.** A `Stream.tick`/`scan` restarts on every
  subscribe, so a seeded snapshot is painted and then contradicted. Cache
  read-once answers, not counters.
- **A live seed is unconfirmed, and screens that write from it must wait.** Pos
  keeps a cart open by creating one when its draft list is empty, so it waits for
  the subscription to confirm the seed (`success && refetching !== true` — *not*
  `useStatus === "ready"`, which would also reject a value that survived a failed
  refresh): the tabs paint from the store at once, but the *decision* waits for the
  first emission (milliseconds). The same rule guards `useCartScreen`'s `?draft=`
  repair and the remembered-cart write. `cache.skip` is still there for a key you
  never want stored at all.
- **A failed revalidation keeps the value**, records `failure` on the key (so the
  gate keeps rendering it and `useStatus` says `stale`), and leaves the entry
  owed so the next visit retries. `save.stale` says the same thing on the write
  side. This is not an error region: the last known value is worth more than a
  notice.
- **A failure is never cached**, so a broken read cannot become permanent.
- **Tags are page-private by default** (`Page:key`). Naming one in
  `cache.tags` shares it across pages (`pageCache.invalidate(tag)`); a page-local
  write calls `pageData.invalidate(key)` from outside a component.
- The store is capped (`maxEntries`, 200 default, oldest-used evicted).

Verification: `src/components/page-data/cache.test.tsx` (the semantics),
`e2e/page-cache.e2e.ts` (the playground: return visit, explicit invalidation),
`e2e/pos-cache.e2e.ts` (the till opens the same cart on the way back).
