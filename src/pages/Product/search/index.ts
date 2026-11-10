import type { Product } from "~/services/product";
import { analyze, compact } from "~/lib/search/normalize";
import { gradeCode, gradeText } from "~/lib/search/quality";
import {
  createIndexCache,
  createMatcher,
  parseQuery,
  rankHits,
  type Hit,
  type Index,
  type Query,
  type Ranked,
} from "~/lib/search/index-cache";

/**
 * The product index: the unit is a product, but a code lives on its listings, so
 * a scanned code still finds the product it belongs to — and a product's
 * categories are matched by name, so typing the shelf reaches everything on it.
 *
 * The query ladder, the score scale and the signature cache live in
 * `~/lib/search/index-cache`; only the weights below are this unit's own. The
 * product stream re-emits a fresh `Product[]` on every hydrate, so the cache is
 * keyed by a text signature instead of by array identity: editing a product
 * rebuilds, a sale does not.
 */

const FIELD = {
  code: 1,
  product: 0.9,
  listing: 0.9,
  alt: 0.8,
  // The broadest thing a product can match: a shelf, not a name. `minuman`
  // should reach the drinks, but a product actually called that has to sit
  // above the whole aisle, so this is the lowest weight there is.
  category: 0.7,
} as const;

/**
 * The one thing this index needs from a category: its id, and the name it is
 * filed under. Names come from `CategoryService` — the product read carries ids
 * only — so they arrive as `context` rather than on the product.
 */
export type CategoryName = { id: string; name: string };

/**
 * The default context: a caller that passed no catalogue (`buildIndex(products)`)
 * files nothing under categories. One shared array, so the name map keyed by it
 * stays stable across calls.
 */
const NO_CATEGORIES: readonly CategoryName[] = [];

/**
 * `categoryId → name`, memoized by the catalogue array.
 *
 * The live store hands over the same array until a category is written, so this
 * is one map per rename instead of one map per product per keystroke.
 */
const nameMaps = new WeakMap<readonly CategoryName[], ReadonlyMap<string, string>>();

function namesById(categories: readonly CategoryName[]): ReadonlyMap<string, string> {
  const cached = nameMaps.get(categories);
  if (cached !== undefined) return cached;
  const names = new Map(categories.map((category) => [category.id, category.name]));
  nameMaps.set(categories, names);
  return names;
}

/**
 * The category names a product is filed under, `""` entries dropped.
 *
 * A link whose category this device has not received resolves to nothing and is
 * skipped: there is no text to index, and inventing one from an id would make
 * every product in that unknown category match the id.
 */
function categoryNamesOf(product: Product, names: ReadonlyMap<string, string>): string[] {
  const resolved: string[] = [];
  for (const id of product.categoryIds) {
    const name = names.get(id);
    if (name !== undefined && name !== "") resolved.push(name);
  }
  return resolved;
}

type AltEntry = { norm: string; words: string[] };

type ListingEntry = {
  nameNorm: string;
  nameWords: string[];
  codeCompact: string | null;
};

type Entry = {
  id: string;
  nameNorm: string;
  nameWords: string[];
  altNames: AltEntry[];
  listings: ListingEntry[];
  categoryNorm: string;
  categoryWords: string[];
};

type SearchIndex = Index<Entry>;

/** A scored match: the product id and its score. */
export type { Hit };

function toEntry(product: Product, categories: readonly CategoryName[] = NO_CATEGORIES): Entry {
  const name = analyze(product.name);
  // Every category the product is filed under, as one field: the query is matched
  // against the shelf the way it is matched against a name.
  const category = analyze(categoryNamesOf(product, namesById(categories)).join(" "));
  return {
    id: product.id,
    nameNorm: name.norm,
    nameWords: name.words,
    altNames: (product.altNames ?? []).map((value) => {
      const alt = analyze(value);
      return { norm: alt.norm, words: alt.words };
    }),
    listings: product.listings.map((listing) => {
      const listingName = analyze(listing.name);
      return {
        nameNorm: listingName.norm,
        nameWords: listingName.words,
        codeCompact: listing.code === null ? null : compact(listing.code),
      };
    }),
    categoryNorm: category.norm,
    categoryWords: category.words,
  };
}

/**
 * A cheap, collision-free fingerprint of the indexed text. Control characters
 * are safe separators because names cannot contain them.
 *
 * The category names are part of it: a rename changes what a query matches
 * without touching a single product row, and a signature that only spelled out
 * the links would serve the old names until the next product edit.
 */
function signatureOf(products: Product[], categories: readonly CategoryName[] = NO_CATEGORIES): string {
  const names = namesById(categories);
  const parts: string[] = [];
  for (const product of products) {
    parts.push(product.id, "\u0000", product.name, "\u0000");
    parts.push((product.altNames ?? []).join("\u0001"), "\u0000");
    parts.push(categoryNamesOf(product, names).join("\u0001"), "\u0000");
    for (const listing of product.listings) {
      parts.push(listing.id, "\u0000", listing.name, "\u0000", listing.code ?? "", "\u0002");
    }
    parts.push("\u0003");
  }
  return parts.join("");
}

const cache = createIndexCache<Product, Entry, readonly CategoryName[]>(signatureOf, toEntry);

/** Build a fresh index. Exported for tests; the app should call `getIndex`. */
export function buildIndex(
  products: Product[],
  categories: readonly CategoryName[] = NO_CATEGORIES,
): SearchIndex {
  return cache.build(products, categories);
}

/**
 * Return the cached index while the indexed text is unchanged, rebuilding only
 * when a product is added, removed, has a name/code/alias edited, or its
 * category is renamed.
 */
export function getIndex(
  products: Product[],
  categories: readonly CategoryName[] = NO_CATEGORIES,
): SearchIndex {
  return cache.get(products, categories);
}

/** Drop the cached index (tests). */
export function resetIndex(): void {
  cache.reset();
}

/** Score every product against `rawQuery`, highest first. */
export function search(index: SearchIndex, rawQuery: string): Hit[] {
  const query = parseQuery(rawQuery);
  if (query === null) return [];
  return rankHits(scoreProducts(index, query), query);
}

/**
 * Every product that matches at all, with the tie-break signals its winning field
 * earned. Shared shape with `scoreListings` in `~/lib/search/listings`: the
 * ranking and the hit floor live in `./index-cache` so a product and a listing
 * cannot drift apart on how ties are broken.
 */
export function scoreProducts(index: SearchIndex, query: Query): Ranked[] {
  const rows: Ranked[] = [];

  for (const entry of index.entries) {
    const matcher = createMatcher(entry.id, query);

    for (const listing of entry.listings) {
      if (listing.codeCompact === null) continue;
      matcher.offerCode(
        gradeCode(listing.codeCompact, query.code),
        FIELD.code,
        listing.codeCompact,
      );
    }

    matcher.offerText(
      gradeText(entry.nameNorm, entry.nameWords, query.norm, query.words, query.options),
      FIELD.product,
      entry.nameNorm,
      entry.nameWords,
    );

    for (const listing of entry.listings) {
      matcher.offerText(
        gradeText(listing.nameNorm, listing.nameWords, query.norm, query.words, query.options),
        FIELD.listing,
        listing.nameNorm,
        listing.nameWords,
      );
    }

    for (const alt of entry.altNames) {
      matcher.offerText(
        gradeText(alt.norm, alt.words, query.norm, query.words, query.options),
        FIELD.alt,
        alt.norm,
        alt.words,
      );
    }

    // Last, and lowest: a category is shared by everything on the shelf, so it
    // can lift a product into the results but must never outrank a name that
    // says the same word.
    matcher.offerText(
      gradeText(
        entry.categoryNorm,
        entry.categoryWords,
        query.norm,
        query.words,
        query.options,
      ),
      FIELD.category,
      entry.categoryNorm,
      entry.categoryWords,
    );

    const row = matcher.result();
    if (row !== null) rows.push(row);
  }

  return rows;
}
