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

    const row = matcher.result();
    if (row !== null) rows.push(row);
  }

  return rows;
}
