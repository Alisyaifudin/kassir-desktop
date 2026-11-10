# Search index — build & query cost, measured

**Date:** 2026-11-10 · **Commit:** `02d6bcb0` (+ working-tree combo scoring change) ·
**Data:** the developer's real `~/.config/com.kassir.app/data.db` (154 MB), copied read-only to `/tmp`.

This note answers one question: **how long does the search index take to build over a real
catalogue**, and what does that mean for a cashier typing in the POS search bar.

## TL;DR

|                                                      | cost                                 | how often                            |
| ---------------------------------------------------- | ------------------------------------ | ------------------------------------ |
| Full listing-index build (7,081 entries)             | **~44 ms**                           | app start, and after any rename/edit |
| Per keystroke, warm (signature + scoring + combos)   | **~17 ms**                           | every paused keystroke               |
| First search of a session (cold JIT + build + score) | **~85 ms**                           | once                                 |
| Combo index (added by the combo-scoring change)      | **~1 ms** build, **~1 ms** per query | negligible                           |

Against `SEARCH_DELAY = 250 ms`, a warm keystroke is **~7 % of the debounce budget** — invisible.
The only visible cost is a single ~60–85 ms synchronous stall on the first search of a session or
the first search after a catalogue edit (~4–5 dropped frames at 60 Hz).

## Environment

|                  |                                                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Machine          | AMD Ryzen 7 6800H, 16 threads                                                                                                                                   |
| Runtime          | bun 1.3.14, Linux x64 — **JavaScriptCore**                                                                                                                      |
| Why that runtime | Linux Tauri webviews are WebKitGTK, which also uses JSC, so the engine is a reasonable proxy. Windows (WebView2/V8) and macOS (WKWebView) will differ somewhat. |
| Measurement      | `performance.now()` around N repetitions; min / median / mean reported. Numbers are steady-state (JIT warm) unless the row says otherwise.                      |
| Not measured     | Frame timings inside the running app (no e2e run was performed), SQLite read cost, memory.                                                                      |

## Data indexed

From the real database on the bench machine:

| table                                  | live rows  |
| -------------------------------------- | ---------- |
| `listings` (POS catalogue)             | 7,081      |
| `products` (for the `/products` index) | 7,081      |
| `combos`                               | 1 (`Nasi`) |
| `extras`                               | 28         |
| `categories`                           | 1          |
| `product_names` (alt names)            | 0          |

## Method

The throwaway script (appendix) read the rows with `bun:sqlite`, built the same
`PosListing[]`, `Product[]`, `Combo[]`, `Extra[]` shapes the services hand the index, and timed the
real modules:

- `src/lib/search/listings.ts` — `buildListingIndex`, `getListingIndex`, `searchListings`
- `src/lib/search/combos.ts` — `buildComboIndex`, `getComboIndex`, `searchCombos`
- `src/pages/Product/search/index.ts` — `buildIndex`, `search`

Three distinct code paths are timed separately, because they fire at different times:

1. **Full build** — tokenize every searchable field (`analyze()`: NFKD, diacritic strip, casefold,
   punctuation → spaces) into an `Entry`. Runs once per _text_ change.
2. **`get` with an unchanged catalogue** — the real per-keystroke path. The service hands over a
   _fresh array_ each read, so the `WeakMap` identity memo misses and the text signature is
   recomputed; the entries themselves are reused while the signature string matches.
3. **`get` after an edit** — signature mismatch, so signature + full rebuild.

## Results

### Listing index (the POS / Restock search)

| measurement                                                    | min     | median      | mean    | n   |
| -------------------------------------------------------------- | ------- | ----------- | ------- | --- |
| `buildListingIndex` — full build                               | 39.2 ms | **44.2 ms** | 42.9 ms | 10  |
| `getListingIndex` — text unchanged (per keystroke)             | 0.65 ms | **1.2 ms**  | 1.3 ms  | 20  |
| `getListingIndex` — one listing renamed (rebuild)              | 41.8 ms | **44.2 ms** | 44.3 ms | 5   |
| `searchListings("nasi")` — score 7,081 entries                 | 12.8 ms | **13.4 ms** | 14.0 ms | 20  |
| `searchListings("sunscreen")`                                  | 15.6 ms | **16.5 ms** | 16.5 ms | 20  |
| `searchListings("hijau")`                                      | 11.6 ms | **12.2 ms** | 12.3 ms | 20  |
| `searchListings("899")` — short query, most entries exit early | 6.5 ms  | **7.9 ms**  | 8.0 ms  | 20  |
| COLD `searchListings("nasi")` — build + score, JIT warm        | 59.6 ms | **62.6 ms** | 62.9 ms | 5   |
| **First search of a fresh process** (JIT cold, build + score)  | —       | **85.5 ms** | —       | 1   |
| WARM whole keystroke — signature + score (no combos)           | 14.3 ms | **15.4 ms** | 15.9 ms | 20  |

Derived unit costs: **6.2 µs per entry** to build, **1.9 µs per entry** to score, **0.17 µs per
entry** to recompute the signature.

### Combo index (folded into the same bar)

| measurement                                              | min     | median     | mean   | n   |
| -------------------------------------------------------- | ------- | ---------- | ------ | --- |
| `getComboIndex` — catalogue unchanged (per keystroke)    | 0.59 ms | **1.2 ms** | 1.1 ms | 20  |
| `buildComboIndex` — full build, context = full catalogue | 0.99 ms | **1.1 ms** | 1.3 ms | 20  |
| `searchCombos("nasi")`                                   | 0.93 ms | **1.1 ms** | 1.3 ms | 50  |

The combo index is rebuilt from a signature that spells out the component names, so it is
catalogue-shaped work over a one-row table — cheap by construction. Combined with the listing path
this is **~17 ms per warm keystroke** (`1.2 + 13.4 + 1.2 + 1.1`), and it removes one duplicate
`service.listing.get.all()` read that the previous combo lookup performed.

### Product index (the `/products` search)

| measurement                      | min     | median      | mean    | n   |
| -------------------------------- | ------- | ----------- | ------- | --- |
| `buildProductIndex` — full build | 51.8 ms | **54.2 ms** | 53.8 ms | 10  |
| `searchProducts("sunscreen")`    | 16.0 ms | **16.9 ms** | 17.2 ms | 20  |

The product index is heavier than the listing index because every product carries all of its
listing names and codes as fields — 7,081 products over 7,081 listings means roughly twice the text.

## What it feels like in the till

- **Typing** — `SEARCH_DELAY = 250 ms` debounce, then ~17 ms of synchronous work. That is 7 % of the
  pause; the pane's appearance is governed by the debounce, not by the index.
- **First search of a session** — ~85 ms cold (JIT not yet warm, nothing cached). At 60 Hz that is
  ~5 dropped frames, once. After the JIT warms, the same cold path is ~62 ms.
- **After editing a catalogue name/code/alias/category** — the next search rebuilds (~44 ms listing,
  ~54 ms product). Editing is a deliberate, occasional act, and the same 250 ms pause covers it.
- **After a sale** — no rebuild. Price, stock and `updated_at` are deliberately outside the
  signature, so a busy till never repays the build for a transaction.

## Caveats

1. **Engine, not app.** These are JavaScriptCore numbers from bun on one machine. The app runs the
   same engine family on Linux, but a low-end till CPU will be slower — scale by single-core
   performance, not by core count (the work is single-threaded).
2. **Main thread.** Both build and scoring are synchronous on the JS thread inside the search
   effect. Nothing here was measured with a frame trace, so the "dropped frames" figures are
   derived from the 16.7 ms budget, not observed.
3. **Signature is recomputed every call** (1.2 ms here) because the services emit a fresh array on
   each read, so the `WeakMap` memo misses by construction. It is content-addressed, so _entries_
   are still reused; only the string is rebuilt.
4. **Scaling is linear in searchable text.** At 10× the catalogue (~70 k listings) expect ~440 ms to
   build and ~150 ms to score. The 250 ms debounce would still hide the query, but the cold build
   would no longer be a one-frame stall.

## Recommendations

Nothing is needed at the current size — the index is well inside its budget.

If the catalogue grows an order of magnitude, in this order:

1. **Stop recomputing the signature per call.** Have the service emit a stable array identity (or
   pass a cheap revision counter) so the `WeakMap` memo hits and the per-keystroke cost drops to the
   scoring pass alone. Cheapest change, ~7 % off every keystroke today, more later.
2. **Move the build off the main thread** (worker or a Tauri command), so a cold build never blocks a
   frame.
3. **Only then** consider SQLite FTS5 — it would trade the current in-memory design for a persisted
   index, which costs a migration and the mapping between FTS rows and the service refs.

## Appendix — reproduction script

Not committed; recreate at the repo root and run `bun bench-search-index.ts` (bun resolves the `~/*`
tsconfig path). Requires a read-only copy of the database at `/tmp/kassir-ro.db`.

```ts
import { Database } from "bun:sqlite";
import type { Extra } from "~/services/extra";
import type { Listing as PosListing } from "~/services/listing";
import type { Combo } from "~/services/combo";
import type { Product, Listing as ProductListing } from "~/services/product";
import type { CategoryName } from "~/pages/Product/search/index";
import {
  buildListingIndex,
  getListingIndex,
  resetListingIndex,
  searchListings,
} from "~/lib/search/listings";
import { buildComboIndex, getComboIndex, searchCombos } from "~/lib/search/combos";
import {
  buildIndex as buildProductIndex,
  search as searchProducts,
} from "~/pages/Product/search/index";

const db = new Database("/tmp/kassir-ro.db", { readonly: true });

/** `performance.now()` around `fn`, `runs` times. Reports min / median / mean ms. */
function measure(label: string, runs: number, fn: () => unknown): void {
  const samples: number[] = [];
  for (let index = 0; index < runs; index++) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  samples.sort((left, right) => left - right);
  const min = samples[0]!;
  const median = samples[Math.floor(samples.length / 2)]!;
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  console.log(
    `${label.padEnd(46)} min ${min.toFixed(2).padStart(7)} ms | med ${median
      .toFixed(2)
      .padStart(7)} ms | mean ${mean.toFixed(2).padStart(7)} ms  (n=${runs})`,
  );
}

// ---------------------------------------------------------------- real data

type Row = {
  listing_id: string;
  listing_name: string;
  listing_price: number;
  listing_unit: number;
  listing_kind: string;
  listing_code: string | null;
  listing_updated_at: number;
  product_id: string;
  product_name: string;
  product_note: string;
  product_flag: number;
};

const rows = db
  .query<Row, []>(
    `SELECT l.listing_id, l.listing_name, l.listing_price, l.listing_unit, l.listing_kind,
            l.listing_code, l.listing_updated_at, p.product_id, p.product_name,
            p.product_note, p.product_flag
     FROM listings l JOIN products p ON p.product_id = l.product_id
     WHERE l.listing_deleted_at IS NULL AND p.product_deleted_at IS NULL`,
  )
  .all();

const altRows = db
  .query<{ product_id: string; product_name_value: string }, []>(
    `SELECT product_id, product_name_value FROM product_names WHERE product_name_deleted_at IS NULL`,
  )
  .all();

const categoryRows = db
  .query<CategoryName, []>(
    `SELECT category_id AS id, category_name AS name FROM categories WHERE category_deleted_at IS NULL`,
  )
  .all();

const categoryLinks = db
  .query<{ product_id: string; category_id: string }, []>(
    `SELECT product_id, category_id FROM product_category WHERE product_category_deleted_at IS NULL`,
  )
  .all();

const extraRows = db
  .query<
    {
      extra_id: string;
      extra_name: string;
      extra_value: number;
      extra_kind: string;
      extra_flag: number;
    },
    []
  >(
    `SELECT extra_id, extra_name, extra_value, extra_kind, extra_flag FROM extras
     WHERE extra_deleted_at IS NULL`,
  )
  .all();

const comboRows = db
  .query<{ combo_id: string; combo_name: string; combo_active: number }, []>(
    `SELECT combo_id, combo_name, combo_active FROM combos WHERE combo_deleted_at IS NULL`,
  )
  .all();
const componentRows = db
  .query<
    {
      combo_id: string;
      combo_listing_id: string;
      listing_id: string;
      combo_listing_qty: number;
      combo_listing_order: number;
    },
    []
  >(
    `SELECT combo_id, combo_listing_id, listing_id, combo_listing_qty, combo_listing_order
     FROM combo_listings`,
  )
  .all();
const comboExtraRows = db
  .query<
    { combo_id: string; combo_extra_id: string; extra_id: string; combo_extra_order: number },
    []
  >(`SELECT combo_id, combo_extra_id, extra_id, combo_extra_order FROM combo_extras`)
  .all();

const altsByProduct = new Map<string, string[]>();
for (const alt of altRows) {
  const list = altsByProduct.get(alt.product_id) ?? [];
  list.push(alt.product_name_value);
  altsByProduct.set(alt.product_id, list);
}
const catsByProduct = new Map<string, string[]>();
for (const link of categoryLinks) {
  const list = catsByProduct.get(link.product_id) ?? [];
  list.push(link.category_id);
  catsByProduct.set(link.product_id, list);
}

const listings: PosListing[] = rows.map((row) => ({
  id: row.listing_id,
  productId: row.product_id,
  name: row.listing_name,
  price: row.listing_price,
  unit: row.listing_unit,
  kind: row.listing_kind,
  code: row.listing_code,
  cover: null,
  stock: 0,
  productName: row.product_name,
  altNames: altsByProduct.get(row.product_id) ?? [],
}));

const extras: Extra[] = extraRows.map((row) => ({
  id: row.extra_id,
  name: row.extra_name,
  value: row.extra_value,
  kind: row.extra_kind as Extra["kind"],
  flag: row.extra_flag,
  updatedAt: 0,
  syncAt: null,
}));

const combos: Combo[] = comboRows.map((row) => ({
  id: row.combo_id,
  name: row.combo_name,
  active: row.combo_active === 1,
  cover: null,
  components: componentRows
    .filter((component) => component.combo_id === row.combo_id)
    .map((component) => ({
      id: component.combo_listing_id,
      listingId: component.listing_id,
      quantity: component.combo_listing_qty,
      order: component.combo_listing_order,
      discounts: [],
    })),
  extras: comboExtraRows
    .filter((extra) => extra.combo_id === row.combo_id)
    .map((extra) => ({
      id: extra.combo_extra_id,
      extraId: extra.extra_id,
      order: extra.combo_extra_order,
    })),
  updatedAt: 0,
  syncAt: null,
}));

const productRows = db
  .query<
    { product_id: string; product_name: string; product_note: string; product_flag: number },
    []
  >(
    `SELECT product_id, product_name, product_note, product_flag FROM products
     WHERE product_deleted_at IS NULL`,
  )
  .all();

const products: Product[] = productRows.map((row) => ({
  id: row.product_id,
  name: row.product_name,
  note: row.product_note,
  flag: row.product_flag,
  altNames: altsByProduct.get(row.product_id) ?? [],
  listings: rows
    .filter((listing) => listing.product_id === row.product_id)
    .map((listing): ProductListing => ({
      id: listing.listing_id,
      productId: listing.product_id,
      name: listing.listing_name,
      price: listing.listing_price,
      unit: listing.listing_unit,
      kind: listing.listing_kind,
      code: listing.listing_code,
      updatedAt: listing.listing_updated_at,
      syncAt: null,
    })),
  categoryIds: catsByProduct.get(row.product_id) ?? [],
  stock: 0,
  capital: 0,
  maxCapital: 0,
  cover: null,
  updatedAt: 0,
  syncAt: null,
}));

console.log(
  `data: ${listings.length} listings · ${products.length} products · ${combos.length} combos · ` +
    `${extras.length} extras · ${categoryRows.length} categories · ${altRows.length} alt names\n`,
);

// --------------------------------------------------------------- benchmarks

// A genuinely cold first search: fresh process, no JIT warm-up, no cache.
{
  const start = performance.now();
  const hits = searchListings(getListingIndex([...listings]), "nasi");
  console.log(
    `FIRST search of the process (build + score, ${hits.length} hits): ` +
      `${(performance.now() - start).toFixed(1)} ms\n`,
  );
}

const listingIndex = buildListingIndex(listings);
measure("buildListingIndex (full build)", 10, () => buildListingIndex(listings));

// The path the app actually takes per keystroke: a fresh array from the stream,
// so the WeakMap misses and the signature has to be recomputed, entries reused.
resetListingIndex();
getListingIndex(listings);
measure("getListingIndex, text unchanged (per keystroke)", 20, () =>
  getListingIndex([...listings]),
);

// Rebuild while entries are cached: signature recompute + full rebuild (rename).
// A unique name per run, or the second run would find the previous signature.
let renames = 0;
measure("getListingIndex, one listing renamed (rebuild)", 5, () => {
  const edited = [...listings];
  edited[0] = { ...edited[0]!, name: `${edited[0]!.name} ${++renames}` };
  return getListingIndex(edited);
});

// The first search of a session, or the first after any rename: signature +
// full build + the scoring pass, which is what a keystroke pays exactly once.
measure('COLD searchListings("nasi") — build + score', 5, () => {
  resetListingIndex();
  return searchListings(getListingIndex([...listings]), "nasi");
});
measure('WARM searchListings("nasi") — signature + score', 20, () =>
  searchListings(getListingIndex([...listings]), "nasi"),
);

for (const query of ["nasi", "sunscreen", "hijau", "899"]) {
  measure(`searchListings("${query}")`, 20, () => searchListings(listingIndex, query));
}

const catalogue = listings;
buildComboIndex(combos, { listings: catalogue, extras });
measure("getComboIndex, catalogue unchanged (per keystroke)", 20, () =>
  getComboIndex(combos, { listings: [...catalogue], extras }),
);
measure("buildComboIndex (context: full catalogue)", 20, () =>
  buildComboIndex(combos, { listings: catalogue, extras }),
);
measure('searchCombos("nasi")', 50, () =>
  searchCombos(buildComboIndex(combos, { listings: catalogue, extras }), "nasi"),
);

const productIndex = buildProductIndex(products, categoryRows);
measure("buildProductIndex (full build)", 10, () => buildProductIndex(products, categoryRows));
measure('searchProducts("sunscreen")', 20, () => searchProducts(productIndex, "sunscreen"));

console.log(`runtime: bun ${Bun.version} · ${process.arch} (JavaScriptCore)`);
```
