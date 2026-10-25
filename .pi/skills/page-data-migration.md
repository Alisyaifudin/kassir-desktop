---
name: page-data-migration
description: Mechanical refactor from the old page-data API (`use` / `useAll` + `<Gate res={…}>`) to `pageData.Gate` (keys-first). Use when migrating any file under src/pages that still passes a `Result` into `<Gate>`, when a component reads data at the top and threads `number | null` down to children, or when a review says "the loading is not fine-grained". Covers the leaf rule, pulse sizing, `useFrame`, `Show`, and what the compiler cannot verify.
---

# Migrating a page to `pageData.Gate`

The old shape was `const res = pageData.use("x")` at the top of a component, then
a `Result` narrowed by hand into `number | null` props for children, with `<Gate
res={res}>` around the region. Two things were wrong with it, and only one of them
was the ternaries:

1. **The read was too coarse.** One `use("today")` served three slots that pulse
   independently, so the component had to project one `Result` into many values —
   and invent a `null` protocol for "not loaded" that collided with real `null`
   data.
2. **The gate did not know what the body read.** `<Gate res={use("records")}>`
   around a body that also reads `debt` rendered the debt slot from `init`
   forever, silently.

`pageData.Gate` takes the **keys**, so both problems are structural. `Home` is the
worked example; `src/pages/Dev/PageData/z-Gate.tsx` is the playground.

---

## Rule #1 — consume the data at the leaf

Read where the value is **rendered**, not in a parent that hands it down. Every
`number | null` prop, every `busy={a === null || b === null}`, every
`undefined`-vs-`null` distinction is a symptom of reading too high.

```tsx
// ✗ BEFORE — one read at the top, three slots to feed, two nullables to combine
function TodayStat({ mode }) {
  const today = pageData.use("today");
  const yesterday = pageData.use("yesterday");

  const error =
    today.type === "error" ? today.error : yesterday.type === "error" ? yesterday.error : null;
  if (error !== null) return <RegionError title="Gagal memuat ringkasan" error={error} />;

  const current = today.type === "success" ? today.data[mode] : null;
  const previous = yesterday.type === "success" ? yesterday.data[mode] : null;

  return (
    <CardFrame busy={current === null || previous === null}>
      <Amount value={current === null ? null : current.total} />
      <Hint count={current === null ? null : current.count} delta={…} />
    </CardFrame>
  );
}
```

```tsx
// ✓ AFTER — the frame reads *state*, each number reads its own key
function TodayStat({ mode, label, icon, tile }) {
  const frame = pageData.useFrame(["today", "yesterday"]);

  return (
    <CardFrame label={label} icon={icon} tile={tile} busy={frame.status === "pending"}>
      <Show
        value={frame.error}
        fallback={
          <>
            <TodayAmount mode={mode} />
            <TodayHint mode={mode} />
          </>
        }
      >
        {(error) => <RegionError title="Gagal memuat ringkasan" error={error} />}
      </Show>
    </CardFrame>
  );
}

function TodayAmount({ mode }) {
  return (
    <span className="text-normal font-semibold tabular-nums">
      Rp{" "}
      <pageData.Gate
        keys={["today"]}
        delay={0}
        pulse={<SkeletonText className="h-[0.7em] w-32" />}
        error={null}
      >
        {({ today }) => today[mode].total.toLocaleString("id-ID")}
      </pageData.Gate>
    </span>
  );
}
```

The card's frame now touches **no value**. It cannot show a number, so it cannot
show a stale or missing one.

---

## The API

| member | job |
|---|---|
| `pageData.Gate` | **the** gate. `keys`, `pulse` (required), `delay` (200 default), `error`, children `(data) => …` where `data` is `Pick<TMap, K>` |
| `pageData.useFrame(keys)` | the state a **frame** needs, no values: `{ status, error }` |
| `pageData.useStatus(key)` | one key's word: `pending` / `ready` / `refreshing` / `failed` / `stale` |
| `pageData.useMutation` | unchanged; `refetching` spans the write **and** its refetch, `stale` says the refetch lost |
| `pageData.use(key)` | still exported — core `Provider` and tests use it. **Do not gate with it** |
| `<Gate res={…}>` | `@deprecated`. Do not add new ones; delete the ones you touch |

`keys` is `readonly (keyof TMap & string)[]`, so a typo is a `tsc` error, and
`data` only contains what you declared — reading an undeclared key does not
compile. **Never** declare a superset: a value that can land earlier gets its own
gate with its own narrower key list.

---

## Recipe

Work **one file at a time**, and verify at the end of each (see §Verify).

### 1. Inventory the file

```bash
grep -n "pageData\.use\|useAll\|<Gate " src/pages/That/Page.tsx
```

For each hit write down: the key(s), the value(s) rendered from them, and which
component renders each value. That list is the new set of gates.

### 2. A region whose body is the thing loading → `keys` on the gate

```tsx
// before
const res = pageData.use("records");
<Gate res={res} skeleton={<LedgerSkeleton />} error={(e) => <RegionError error={e} />}>
  {({ data }) => <LedgerRows records={data} />}
</Gate>

// after
<pageData.Gate
  keys={["records"]}
  pulse={<LedgerSkeleton />}
  error={(error) => <RegionError error={error} />}
>
  {({ records }) => <LedgerRows records={records} />}
</pageData.Gate>
```

Delete the `const res = …` line. If something else in the function needed it,
that something is the next step.

### 3. `useAll(a, b)` → the same gate, two keys

`keys={["a", "b"]}`. If the two values can land at different times and the
design wants them to (a count and its comparison, an amount and its delta), do
**not** merge them: give each its own gate with its own key list.

### 4. A value inside static words → the same gate, `delay={0}`, `error={null}`

Move the value into a leaf component and gate it there. Keep the surrounding
words, prefixes (`Rp`) and labels outside the gate — they are not data.

- `delay={0}` because deferring an inline value puts a hole in a sentence
  (the 200 ms window is for region-sized pulses, see `page-data.md` §5).
- `error={null}` because an inline slot has no error treatment of its own: the
  card reads `useFrame` and shows one error for the whole card.

### 5. The frame → `useFrame`

Replace any `busy={…}` / `error` derivation in a card or panel head with:

```tsx
const frame = pageData.useFrame(["a", "b"]);
// frame.status: "pending" | "ready" | "refreshing" | "failed" | "stale"
// frame.error:  TError | null — the first failure, for the one error treatment
```

`status === "pending"` is `busy`. `error !== null` replaces the error card.

### 6. Chrome that depends on a *value* — the one real conflict

`useFrame` has no values, on purpose. If a frame's markup depends on a value
(a link that only exists when something is owed, a destructive tone), you have
two honest options:

- **make the chrome static** — `Home`'s debt card always links to `/debt`, like
  the money card always links to `/money`; and the tone moves *inside* the gate,
  where the value is: `cn("…", total !== 0 && "text-destructive")`;
- **gate the chrome itself** — the link becomes a gate whose `pulse` is the
  chrome without the link.

When the value is needed to decide **which** chrome exists (a `NotFound` for a
whole screen, a table whose column count depends on the row), nest a gate instead
of reading at the top — the outer one owns the value, the inner one waits on its
own key:

```tsx
// pages/Money/History — the pocket decides NotFound and the table's shape
<pageData.Gate keys={["pockets"]} pulse={<><HeaderLoading /><TableLoading /></>} error={…}>
  {({ pockets }) => {
    const pocket = pockets.find(…)?.pocket;
    if (pocket === undefined) return <NotFound />;
    return (
      <>
        <Header pocket={pocket} />
        {/* its placeholder was already on screen with the pocket's, so no delay */}
        <pageData.Gate keys={["entries"]} delay={0} pulse={<TableLoading cols={…} />} error={…}>
          {({ entries }) => <TableList money={entries} type={pocket.type} />}
        </pageData.Gate>
      </>
    );
  }}
</pageData.Gate>
```

Do **not** reintroduce `pageData.use` at the top of the card to get the value.
That is the pattern we are leaving.

### 7. Freshness → `useStatus`, not a flag on the body

The gate never re-enters on a refetch (the value is kept), so "is this
refreshing?" is a separate question:

```tsx
const status = pageData.useStatus("flaky");
<Show when={status === "stale"}>
  <p>Penyegaran terakhir gagal — nilai lama dipertahankan.</p>
</Show>
```

`stale` = the value on screen is old **and** the refresh that would renew it
failed. It is not an error: render the value, say the word.

### 8. Render branches → `Show` (`~/components/Show`)

```tsx
<Show when={cond} fallback={<Other />}>…</Show>          // boolean, no narrowing
<Show value={maybeError}>{() => …}</Show>                 // narrows the value
<Show value={delta}>{() => <Change />}</Show>             // null → fallback (nothing)
```

- `Show when` does **not** narrow its children (`when={frame.error !== null}`
  leaves `frame.error` as `TError | null` inside). When you need the narrowed
  value, use the `value` form.
- `Show value={x}` treats `null`/`undefined` as "render the fallback". That is
  safe for a **data** `null` only *inside* a gate, where "still loading" can no
  longer happen. Never use `Show value` (or `??`) to decide between a value and
  its pulse: that is exactly the two-absences-in-one-channel bug.
- `credit ? "Kredit" : "Lunas"` is a two-way value, not a nullability — leave the
  ternary. Convert only branches that are "there is nothing here".

### 9. Opt into the cache — and audit four questions

Every page registry carries `cache: true` (`registry-cache.test.ts` enforces it),
so a page is only cacheable if its sources are the right shape. Answer, in order:

1. every key is a `Stream` (never a `Stream.tick`/`scan` derivation);
2. no `Effect` key that nothing invalidates — that one goes in `cache.skip`;
3. no screen *writes* from a seeded key without waiting for `refetching` to clear;
4. `deps` names every input that changes the question (day, range, query, role).

If (1) or (2) cannot be met, the page stays uncached and the registry test needs
the exception written down next to it.

### 10. Prove nothing was left behind

```bash
grep -n "? null\|=== null ||\|number | null\|undefined : undefined" src/pages/That/Page.tsx
```

Every remaining `null` must be **data**. Props typed `T | null` that a child
interprets as loading are the bug this refactor removes — the child should gate
itself instead.

---

## Rules that are easy to break

- **`pulse` is required.** A gate without a placeholder has no loading state; a
  value would appear by moving everything around it. Size the pulse to the value
  it stands in for (see `page-data.md` §13) and give it a `small:` twin where the
  type scale changes.
- **Keep the reserved floor outside the gate.** A `delay` blank plus no reserved
  space collapses the card. `min-h` belongs on the container that wraps the gate,
  not in the pulse.
- **One gate per independently landing value.** N gates on one key is free (one
  subscription); one gate on N keys where they could land apart is a design
  regression.
- **A `Stream.empty` key** (the admin-only pattern) stays `pending` forever. Gate
  it only inside the component that is rendered for the role that registers it.
- **Cart strips with a `key={attempt}` remount retry** are deliberately not on
  this pattern (`page-data.md` §12). Leave them; if you migrate one, keep the
  retry by giving the gate an `error` slot whose button calls
  `pageData.useRefresh()`.
- **No `useGet`/`useResult`/`LoadAsync`/`Slot`.** They existed briefly and were
  removed; if you find them in a file or a branch, the file predates this note.

## Verify (what the compiler cannot see)

Run, in this order:

```bash
npx tsc --noEmit                      # keys are declared correctly
npx eslint <touched paths>
bun test src/components/page-data/     # the gate's own contract
```

Then **eyeball it** — none of the following fails a type check:

- [ ] The card's height is identical before and after the data lands.
- [ ] The words, labels, `Rp` and icons are on screen from the first frame; only
      values pulse.
- [ ] Pulse widths match the real values at both app sizes (`big` and `small`).
- [ ] The empty state and the loaded list share the same floor.
- [ ] A failed key shows one error for the region, not one per value.
- [ ] A refetch (mutation or `useRefresh`) never blanks the region and never
      brings the pulse back.
- [ ] Nothing under `pages/That` still passes a `Result` or a `T | null` down.

`e2e/home.e2e.ts` is the e2e reference for the regions and their order. Running
it (or the app) needs explicit permission — a green `tsc` is not evidence that
the layout still holds.

## Done so far

The sweep is finished: **every page under `src/pages` reads through
`pageData.Gate`.** 29 files were migrated; `tsc`, `eslint` and `bun test` (611
tests) are green.

| area | what it ended up looking like |
|---|---|
| `Cashier`, `Customer`, `Method`, `Social` | one body gate per list, inline failure line |
| `Product` | body gate + `Rows` (client filter/paging derives inside it); the filter popover and pager gate their own numbers |
| `Product/Detail`, `.../Info`, `.../Image` | header gate with four states; `Info`'s pulse is the same `Body product={undefined}` |
| `Record`, `Record/Item`, `Record/z-Detail`, `Record/Search` | one registry per screen; a local registry (and `Provider`) where the key is param-scoped |
| `Money`, `Money/History` | nested gates where the frame is value-dependent |
| `Debt`, `Extra`, `Extra/Detail` | former `useQuery`/`useStream` pages, adopted to `createPageData` |
| `Setting/{Shop,Printer,Log}` | unchanged shape, keys added; `PendingValue`/`ReservedSkeleton` kept |
| `Home`, `Home/z-Uang` | already migrated, reference |
| `Dev/PageData` | both sections now on the new gate |

Two exceptions, both needing a `Result` for a reason:

- **`Dev/PageCache` (cache lab)** keeps the deprecated prop-driven `Gate`: its
  subject is the `Result` itself (`useFirstPaint` asks "were you already data at
  mount?").
- **Cart screens** (`Pos`, `Restock`, and the four cart sub-components) keep
  `pageData.use`, because the read is an **argument to a hook** (`useCartScreen`)
  or a control that must survive a failure with an empty list — there is no value
  to gate. Their state questions stay on the `Result` too: Pos's `ready` is
  literally `success && refetching !== true`, and `useStatus === "ready"` would
  wrongly reject a value that outlived a failed refresh.

Legacy `useQuery`/`useStream` screens that were never on `page-data`
(`Analytics`, `Login`, `Transaction`, dialogs) stay on `Loader` — see
`page-data.md` §12.

### e2e baseline (measured, not guessed)

`npx playwright test` -> **23 passed / 7 failed**, and none of the 7 belong to this migration.
Run the same suite in a worktree at `HEAD` (`git worktree add /tmp/x HEAD`,
symlink `node_modules`) and it is **22 passed / 5 failed**:

- `transaction.e2e.ts` -- 5 failures, **pre-existing at `HEAD`**: the adjustment
  cart opens with zero lines, so `gridcell "Nama baris 1"` never exists. The
  dialog test in the same file passes.
- `page-cache.e2e.ts` -- 2 tests (1 failing), and `pos-cache.e2e.ts` (1 failing):
  both **untracked WIP** specs for the uncommitted cache feature, absent at
  `HEAD`. `page-cache`'s failing step asserts that the *uncached* panel re-reads
  after `pageCache.invalidate`, which the store deliberately cannot do
  (`Provider`'s watcher returns early when the page did not opt into `cache`) and
  the lab's own header comment agrees with the code.

Do not "fix" either by weakening the gate: they are outside the page-data pattern.

