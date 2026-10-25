---
slug: search-index-implemented-three-times-stocks-dead
title: "The search index is implemented three times, and the third copy is dead code kept alive by its own test"
severity: medium
category: maintainability
iteration: 5
created: 2026-10-21T19:53:11.090Z
files:
  - "src/lib/search/stocks.ts"
  - "src/lib/search/listings.ts"
  - "src/pages/Product/search/index.ts"
  - "src/lib/reqwest.ts"
---

# The search index is implemented three times, and the third copy is dead code kept alive by its own test

- **Severity:** medium
- **Category:** maintainability
- **Files:** `src/lib/search/stocks.ts`, `src/lib/search/listings.ts`, `src/pages/Product/search/index.ts`, `src/lib/reqwest.ts`
- **Iteration:** 5

## Summary

The signature-cached fuzzy index is copy-pasted three times (`lib/search/listings.ts`, `pages/Product/search/index.ts`, `lib/search/stocks.ts`) with per-copy field weights, so the "same ladder everywhere" comment is maintained by hand and already inaccurate. `stocks.ts` has no consumer at all — only its own test imports it, and it documents a record-detail lot chooser that does not exist — while `lib/reqwest.ts` is likewise a dead module. The `>>` "test exists, feature doesn't" pattern hides dead code from every sweep.

## Details

## Evidence

Three modules implement the same "signature-cached fuzzy index" algorithm:

| module | unit | consumed by |
|---|---|---|
| `src/pages/Product/search/index.ts` (192 lines) | product | `src/pages/Product/use-filtered.ts:79` |
| `src/lib/search/listings.ts` (~155) | listing | `src/services/listing/live.ts:60` |
| `src/lib/search/stocks.ts` (182) | stock lot | **nothing** |

They share only the low-level primitives (`./normalize`, `./quality`). Everything
else is copy-paste, verbatim in structure and largely in text:

```
const SCALE = 9999;
const FIELD = { code: 1, … } as const;
function toEntry(...)                     // per unit
function signatureOf(xs) { … WeakMap … }  // identical
let cache: { signature; index } | null = null;
export function get…Index(xs) { if (cache !== null && cache.signature === signature) return cache.index; … }
export function reset…Index() { cache = null; signatures = new WeakMap(); }
export function search…(index, rawQuery) {
  const query = norm(rawQuery); … const queryWords = query.split(" ");
  const queryCode = compact(rawQuery); const length = queryCode.length;
  const options: TextOptions = { tokenPrefix: length >= 2, weak: length >= 3 };
  const minimum = length <= 1 ? 7000 : length === 2 ? 5000 : 1500;
  … const score = Math.round(SCALE * best); if (score >= minimum) hits.push({ id, score });
  hits.sort((a, b) => b.score - a.score);
}
```

`src/lib/search/listings.ts:1-10` even claims "Text scores reuse the same ladder
as product search, so the same query behaves consistently across both pages" —
but the `FIELD` weights differ per copy (product: `code 1, product .88, listing
.92`; listings: `code 1, listing .92, product .88, alt .8`; stocks: `code 1,
product 1, listing .92, alt .85`), so the consistency claim is maintained by
hand, in three places, and is already only approximately true.

`src/lib/search/stocks.ts` has **no consumer**: `rg "search/stocks|getStockIndex"`
matches only `src/lib/search/stocks.test.ts`. Its header claims it is "used by
the record-detail 'choose a lot' dialog" — that dialog does not exist (no lot
chooser under `src/pages/Record/`). It is dead code whose 8 passing tests
(`bun test`: "stock ladder …", "stock index cache …") make the dead module look
alive and make the suite look bigger than the shipped surface.

`src/lib/reqwest.ts` (48 lines) is the same pattern one level down: an unused
HTTP client with an unused capability behind it (see the Tauri report).

## Why it matters

The index is the hot path of every search box in the app and the place where a
one-character regex change can silently reorder the POS catalogue. Having three
copies means a fix lands once and the other two keep the bug — the iteration-4
product-identity work (comparing values, not `*_updated_at` timestamps) had to be
applied per service for the same reason. And a module that only its own test
imports is worse than deleted code: it survives every "dead code" sweep because
the test suite references it, and it misleads the next reader about what the app
does.

## Recommended fix

1. Collapse the three into one factory parameterised by the unit of search:

```ts
// src/lib/search/index-cache.ts
export function createSearchIndex<Item, Entry, Hit>(opts: {
  toEntry: (item: Item) => Entry;
  signature: (item: Item) => string;   // or reuse `signatureOf` with a fields list
  fieldWeights: FieldWeights;
  grade: (entry: Entry, q: Query) => number;
})
```

   `listings.ts` (two consumers' worth of behaviour) and
   `Product/search/index.ts` then become ~30-line configurations. Keep
   `quality.ts`/`normalize.ts` exactly as they are — they are the parts that are
   genuinely shared and tested.
2. Make the "same ladder for both pages" claim true by construction: one
   `FIELD` table, with the product/listing-specific entry point choosing which
   field each row type carries.
3. Delete `src/lib/search/stocks.ts` and its test (the lot chooser it was written
   for is not in the shipped app), or, if the chooser is planned, keep it in a
   branch — not in `src/` behind a green test.
4. Delete `src/lib/reqwest.ts` (see the Tauri report for its capability).

## Acceptance criteria

- One implementation of the signature cache and the score→hit plumbing
  (`SCALE`, `minimum`, `hits.sort`) in `src/lib/search/`.
- `resetIndex`-style exports exist once; the three per-module `cache` variables
  are gone.
- No module under `src/` is imported only by `*.test.ts` (`rg` check in CI).
- The existing search tests (`listings.test.ts`, `Product/search/index.test.ts`)
  still pass unchanged, which proves behaviour was preserved.

## Verification

- `rg -n "SCALE = 9999" src` returns one hit.
- `rg -n "getStockIndex|search/stocks" src --glob '!*.test.ts'` returns nothing.
- `bun test` green, including the ranking tests, after the collapse.
- `bunx tsc --noEmit` and `bun run lint` clean.
