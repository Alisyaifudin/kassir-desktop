import { analyze, compact } from "./normalize";
import { gradeCode, gradeText } from "./quality";
import {
  createIndexCache,
  parseQuery,
  sortHits,
  toHit,
  type Hit,
  type Index,
} from "./index-cache";

/**
 * The restock listing index. Unlike the product index, the unit is a *listing*:
 * a product can have many, and the buyer is picking a specific one. Matching
 * still reaches into the parent product, but the listing's own name outranks it.
 *
 * Field order: code (a scanned identifier) > listing name > product name >
 * alternative name. The query ladder, the score scale and the cache live in
 * `./index-cache`; only the weights below are this unit's own.
 */

const FIELD = {
  code: 1,
  listing: 0.92,
  product: 0.88,
  alt: 0.8,
} as const;

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

  const hits: ListingHit[] = [];
  for (const entry of index.entries) {
    let best = 0;

    if (entry.codeCompact !== null) {
      const quality = gradeCode(entry.codeCompact, query.code);
      if (quality > 0) best = Math.max(best, quality * FIELD.code);
    }

    best = Math.max(
      best,
      gradeText(entry.nameNorm, entry.nameWords, query.norm, query.words, query.options) *
        FIELD.listing,
    );
    best = Math.max(
      best,
      gradeText(entry.productNorm, entry.productWords, query.norm, query.words, query.options) *
        FIELD.product,
    );

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
