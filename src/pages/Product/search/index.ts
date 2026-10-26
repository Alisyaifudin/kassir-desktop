import type { Product } from "~/services/product";
import { analyze, compact } from "~/lib/search/normalize";
import { gradeCode, gradeText } from "~/lib/search/quality";
import {
  createIndexCache,
  parseQuery,
  sortHits,
  toHit,
  type Hit,
  type Index,
} from "~/lib/search/index-cache";

/**
 * The product index: the unit is a product, but a code lives on its listings, so
 * a scanned code still finds the product it belongs to.
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
} as const;

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
};

type SearchIndex = Index<Entry>;

/** A scored match: the product id and its score. */
export type { Hit };

function toEntry(product: Product): Entry {
  const name = analyze(product.name);
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
  };
}

/**
 * A cheap, collision-free fingerprint of the indexed text. Control characters
 * are safe separators because names cannot contain them.
 */
function signatureOf(products: Product[]): string {
  const parts: string[] = [];
  for (const product of products) {
    parts.push(product.id, "\u0000", product.name, "\u0000");
    parts.push((product.altNames ?? []).join("\u0001"), "\u0000");
    for (const listing of product.listings) {
      parts.push(listing.id, "\u0000", listing.name, "\u0000", listing.code ?? "", "\u0002");
    }
    parts.push("\u0003");
  }
  return parts.join("");
}

const cache = createIndexCache<Product, Entry>(signatureOf, toEntry);

/** Build a fresh index. Exported for tests; the app should call `getIndex`. */
export function buildIndex(products: Product[]): SearchIndex {
  return cache.build(products);
}

/**
 * Return the cached index while the indexed text is unchanged, rebuilding only
 * when a product is added, removed, or has a name/code/alias edited.
 */
export function getIndex(products: Product[]): SearchIndex {
  return cache.get(products);
}

/** Drop the cached index (tests). */
export function resetIndex(): void {
  cache.reset();
}

/** Score every product against `rawQuery`, highest first. */
export function search(index: SearchIndex, rawQuery: string): Hit[] {
  const query = parseQuery(rawQuery);
  if (query === null) return [];

  const hits: Hit[] = [];
  for (const entry of index.entries) {
    let best = 0;

    for (const listing of entry.listings) {
      if (listing.codeCompact === null) continue;
      const quality = gradeCode(listing.codeCompact, query.code);
      if (quality > 0) best = Math.max(best, quality * FIELD.code);
    }

    best = Math.max(
      best,
      gradeText(entry.nameNorm, entry.nameWords, query.norm, query.words, query.options) *
        FIELD.product,
    );

    for (const listing of entry.listings) {
      best = Math.max(
        best,
        gradeText(listing.nameNorm, listing.nameWords, query.norm, query.words, query.options) *
          FIELD.listing,
      );
    }

    for (const alt of entry.altNames) {
      best = Math.max(
        best,
        gradeText(alt.norm, alt.words, query.norm, query.words, query.options) * FIELD.alt,
      );
    }

    const result = toHit(entry.id, best, query);
    if (result !== null) hits.push(result);
  }

  return sortHits(hits);
}
