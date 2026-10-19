import { analyze, compact, norm } from "./normalize";
import { gradeCode, gradeText, type TextOptions } from "./quality";

/**
 * The restock listing index. Unlike the product index, the unit is a *listing*:
 * a product can have many, and the buyer is picking a specific one. Matching
 * still reaches into the parent product, but the listing's own name outranks it.
 *
 * Field order: code (a scanned identifier) > listing name > product name >
 * alternative name. Text scores reuse the same ladder as product search, so the
 * same query behaves consistently across both pages.
 */

const SCALE = 9999;

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

export type ListingIndex = {
  signature: string;
  entries: Entry[];
};

export type ListingHit = { id: string; score: number };

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

let signatures = new WeakMap<SearchableListing[], string>();

function signatureOf(listings: SearchableListing[]): string {
  const cached = signatures.get(listings);
  if (cached !== undefined) return cached;

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

  const signature = parts.join("");
  signatures.set(listings, signature);
  return signature;
}

export function buildListingIndex(listings: SearchableListing[]): ListingIndex {
  return { signature: signatureOf(listings), entries: listings.map(toEntry) };
}

let cache: { signature: string; index: ListingIndex } | null = null;

/** Rebuilds only when a listing name/code, product name, or alias changes. */
export function getListingIndex(listings: SearchableListing[]): ListingIndex {
  const signature = signatureOf(listings);
  if (cache !== null && cache.signature === signature) return cache.index;
  const index = buildListingIndex(listings);
  cache = { signature, index };
  return index;
}

export function resetListingIndex(): void {
  cache = null;
  signatures = new WeakMap();
}

/** Score every listing against `rawQuery`, highest first. */
export function searchListings(index: ListingIndex, rawQuery: string): ListingHit[] {
  const query = norm(rawQuery);
  if (query === "") return [];

  const queryWords = query.split(" ");
  const queryCode = compact(rawQuery);
  const length = queryCode.length;
  const options: TextOptions = { tokenPrefix: length >= 2, weak: length >= 3 };
  const minimum = length <= 1 ? 7000 : length === 2 ? 5000 : 1500;

  const hits: ListingHit[] = [];
  for (const entry of index.entries) {
    let best = 0;

    if (entry.codeCompact !== null) {
      const quality = gradeCode(entry.codeCompact, queryCode);
      if (quality > 0) best = Math.max(best, quality * FIELD.code);
    }

    best = Math.max(
      best,
      gradeText(entry.nameNorm, entry.nameWords, query, queryWords, options) * FIELD.listing,
    );
    best = Math.max(
      best,
      gradeText(entry.productNorm, entry.productWords, query, queryWords, options) * FIELD.product,
    );

    for (const alt of entry.altNames) {
      best = Math.max(best, gradeText(alt.norm, alt.words, query, queryWords, options) * FIELD.alt);
    }

    if (best <= 0) continue;
    const score = Math.round(SCALE * best);
    if (score >= minimum) hits.push({ id: entry.id, score });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits;
}
