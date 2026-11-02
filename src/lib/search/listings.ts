import { analyze, compact } from "./normalize";
import { gradeCode, gradeText, TEXT } from "./quality";
import {
  createIndexCache,
  createMatcher,
  parseQuery,
  rankHits,
  type Hit,
  type Index,
  type Query,
  type Ranked,
} from "./index-cache";

/**
 * The restock listing index. Unlike the product index, the unit is a *listing*:
 * a product can have many, and the buyer is picking a specific one. Matching
 * still reaches into the parent product, but the listing's own name outranks it.
 *
 * Field order: code (a scanned identifier) > listing name > alternative name >
 * product name. An alternative name sits above the product name because it is a
 * name the operator *recorded for this product* (`product_names`), while the
 * product name is the umbrella every listing under it inherits — so "indomie"
 * typed into the till should reach the listing whose product is aliased
 * `Indomie Goreng` before it reaches one that merely shares a parent name, and
 * still rank below a listing that is actually called that.
 *
 * The query ladder, the score scale and the cache live in `./index-cache`; only
 * the weights below are this unit's own.
 */

/**
 * Exported so the evaluation harness in `./eval` scores candidates with the same
 * weights the app ships instead of copying them. Copying is what the three-fold
 * index duplication was made of; a candidate that wins there must change *this*
 * constant, not a parallel one.
 */
export const LISTING_FIELD = {
  code: 1,
  listing: 0.92,
  alt: 0.9,
  product: 0.88,
} as const;

/**
 * An alias only matched by fuzz (a subsequence or a typo) is a guess about what
 * the operator once wrote down, not a recorded synonym. Damp it so it cannot
 * outrank a real word match on a listing or product name; the small factor keeps
 * a genuine misspelling of a recorded alias inside the query minimum.
 */
export const FUZZ_ALIAS_DAMPENER = 0.9;

export type SearchableListing = {
  id: string;
  name: string;
  code: string | null;
  productName: string;
  altNames: string[];
};

type AltEntry = { norm: string; words: string[] };

type Entry = {
  id: string;
  nameNorm: string;
  nameWords: string[];
  codeCompact: string | null;
  productNorm: string;
  productWords: string[];
  altNames: AltEntry[];
};

type ListingIndex = Index<Entry>;

type ListingHit = Hit;

function toEntry(listing: SearchableListing): Entry {
  const name = analyze(listing.name);
  const product = analyze(listing.productName);
  return {
    id: listing.id,
    nameNorm: name.norm,
    nameWords: name.words,
    codeCompact: listing.code === null ? null : compact(listing.code),
    productNorm: product.norm,
    productWords: product.words,
    altNames: (listing.altNames ?? []).map((value) => {
      const alt = analyze(value);
      return { norm: alt.norm, words: alt.words };
    }),
  };
}

/** The fields that affect matching — not stock, price, or `updated_at`. */
function signatureOf(listings: SearchableListing[]): string {
  const parts: string[] = [];
  for (const listing of listings) {
    parts.push(
      listing.id,
      "\u0000",
      listing.name,
      "\u0000",
      listing.code ?? "",
      "\u0000",
      listing.productName,
      "\u0000",
      (listing.altNames ?? []).join("\u0001"),
      "\u0002",
    );
  }
  return parts.join("");
}

const cache = createIndexCache<SearchableListing, Entry>(signatureOf, toEntry);

/** Build a fresh index. Exported for tests; the app calls `getListingIndex`. */
export function buildListingIndex(listings: SearchableListing[]): ListingIndex {
  return cache.build(listings);
}

/** Rebuilds only when a listing name/code, product name, or alias changes. */
export function getListingIndex(listings: SearchableListing[]): ListingIndex {
  return cache.get(listings);
}

export function resetListingIndex(): void {
  cache.reset();
}

/** Score every listing against `rawQuery`, highest first. */
export function searchListings(index: ListingIndex, rawQuery: string): ListingHit[] {
  const query = parseQuery(rawQuery);
  if (query === null) return [];
  return rankHits(scoreListings(index, query), query);
}

/**
 * Every listing that matches `query` at all, with the tie-break signals its
 * winning field earned. The ranking itself is `rankHits` in `./index-cache`.
 *
 * Exported so the harness in `./eval` can score alternative orderings over the
 * *same* matches: a ranking experiment must never be able to change which
 * listings match, only their order.
 */
export function scoreListings(index: ListingIndex, query: Query): Ranked[] {
  const rows: Ranked[] = [];

  for (const entry of index.entries) {
    const matcher = createMatcher(entry.id, query);

    if (entry.codeCompact !== null) {
      matcher.offerCode(
        gradeCode(entry.codeCompact, query.code),
        LISTING_FIELD.code,
        entry.codeCompact,
      );
    }

    matcher.offerText(
      gradeText(entry.nameNorm, entry.nameWords, query.norm, query.words, query.options),
      LISTING_FIELD.listing,
      entry.nameNorm,
      entry.nameWords,
    );
    matcher.offerText(
      gradeText(entry.productNorm, entry.productWords, query.norm, query.words, query.options),
      LISTING_FIELD.product,
      entry.productNorm,
      entry.productWords,
    );

    for (const alt of entry.altNames) {
      const quality = gradeText(alt.norm, alt.words, query.norm, query.words, query.options);
      if (quality === 0) continue;
      const dampener = quality <= TEXT.subsequence ? FUZZ_ALIAS_DAMPENER : 1;
      matcher.offerText(quality * dampener, LISTING_FIELD.alt, alt.norm, alt.words);
    }

    const row = matcher.result();
    if (row !== null) rows.push(row);
  }

  return rows;
}
