import type { Product } from "~/services/product";
import { analyze, compact, norm } from "./normalize";
import { gradeCode, gradeText, type TextOptions } from "./quality";

/**
 * A reusable, signature-gated search index.
 *
 * The product stream re-emits a fresh `Product[]` on every hydrate — including
 * stock and price changes — so the array identity is not a useful cache key.
 * Instead the index is keyed by a *text signature* of the fields that actually
 * affect matching (id, product name, alternative names, listing name/code).
 * Editing a product, adding one, or deleting one changes the signature and
 * rebuilds; a sale or a price edit does not.
 */

const SCALE = 9999;

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

export type SearchIndex = {
  signature: string;
  entries: Entry[];
};

export type Hit = { id: string; score: number };

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

let signatures = new WeakMap<Product[], string>();

/**
 * A cheap, collision-free fingerprint of the indexed text. Control characters
 * are safe separators because names cannot contain them.
 */
function signatureOf(products: Product[]): string {
  const cached = signatures.get(products);
  if (cached !== undefined) return cached;

  const parts: string[] = [];
  for (const product of products) {
    parts.push(product.id, "\u0000", product.name, "\u0000");
    parts.push((product.altNames ?? []).join("\u0001"), "\u0000");
    for (const listing of product.listings) {
      parts.push(listing.id, "\u0000", listing.name, "\u0000", listing.code ?? "", "\u0002");
    }
    parts.push("\u0003");
  }

  const signature = parts.join("");
  signatures.set(products, signature);
  return signature;
}

/** Build a fresh index. Exported for tests; the app should call `getIndex`. */
export function buildIndex(products: Product[]): SearchIndex {
  return { signature: signatureOf(products), entries: products.map(toEntry) };
}

let cache: { signature: string; index: SearchIndex } | null = null;

/**
 * Return the cached index while the indexed text is unchanged, rebuilding only
 * when a product is added, removed, or has a name/code/alias edited.
 */
export function getIndex(products: Product[]): SearchIndex {
  const signature = signatureOf(products);
  if (cache !== null && cache.signature === signature) return cache.index;
  const index = buildIndex(products);
  cache = { signature, index };
  return index;
}

/** Drop the cached index (tests). */
export function resetIndex(): void {
  cache = null;
  signatures = new WeakMap();
}

/** Score every product against `rawQuery`, highest first. */
export function search(index: SearchIndex, rawQuery: string): Hit[] {
  const query = norm(rawQuery);
  if (query === "") return [];

  const queryWords = query.split(" ");
  const queryCode = compact(rawQuery);
  const length = queryCode.length;
  const options: TextOptions = { tokenPrefix: length >= 2, weak: length >= 3 };
  const minimum = length <= 1 ? 7000 : length === 2 ? 5000 : 1500;

  const hits: Hit[] = [];
  for (const entry of index.entries) {
    let best = 0;

    for (const listing of entry.listings) {
      if (listing.codeCompact === null) continue;
      const quality = gradeCode(listing.codeCompact, queryCode);
      if (quality > 0) best = Math.max(best, quality * FIELD.code);
    }

    best = Math.max(
      best,
      gradeText(entry.nameNorm, entry.nameWords, query, queryWords, options) * FIELD.product,
    );

    for (const listing of entry.listings) {
      best = Math.max(
        best,
        gradeText(listing.nameNorm, listing.nameWords, query, queryWords, options) * FIELD.listing,
      );
    }

    for (const alt of entry.altNames) {
      best = Math.max(
        best,
        gradeText(alt.norm, alt.words, query, queryWords, options) * FIELD.alt,
      );
    }

    if (best <= 0) continue;
    const score = Math.round(SCALE * best);
    if (score >= minimum) hits.push({ id: entry.id, score });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits;
}
