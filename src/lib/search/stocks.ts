import { analyze, compact, norm } from "./normalize";
import { gradeCode, gradeText, type TextOptions } from "./quality";

/**
 * The stock-lot index used by the record-detail "choose a lot" dialog.
 *
 * The selectable unit is a *lot* (`stocks.stock_id`), because that is what a
 * `product_event` points at. A product can have several listings, so the lot
 * carries them all for matching and display; the search reports the listing
 * that matched best so the card can show its price/code, while the lot's own
 * value/capital are read live from the product data.
 *
 * Field order: product name and code at the top, then the listing name, then
 * alternative names. As with every index here, the cache is keyed by a text
 * signature, so stock/capital changes never rebuild it.
 */

const SCALE = 9999;

const FIELD = {
  code: 1,
  product: 1,
  listing: 0.92,
  alt: 0.85,
} as const;

export type SearchableStockListing = {
  id: string;
  name: string;
  code: string | null;
  price: number;
  unit: number;
};

export type SearchableStock = {
  id: string;
  productId: string;
  productName: string;
  altNames: string[];
  listings: SearchableStockListing[];
};

export type StockHit = {
  id: string;
  score: number;
  /** The listing with the strongest listing-level match, if any. */
  listingId: string | null;
};

type AltEntry = { norm: string; words: string[] };

type ListingEntry = {
  id: string;
  nameNorm: string;
  nameWords: string[];
  codeCompact: string | null;
};

type Entry = {
  id: string;
  productNorm: string;
  productWords: string[];
  altNames: AltEntry[];
  listings: ListingEntry[];
};

export type StockIndex = {
  signature: string;
  entries: Entry[];
};

function toEntry(stock: SearchableStock): Entry {
  const product = analyze(stock.productName);
  return {
    id: stock.id,
    productNorm: product.norm,
    productWords: product.words,
    altNames: (stock.altNames ?? []).map((value) => {
      const alt = analyze(value);
      return { norm: alt.norm, words: alt.words };
    }),
    listings: stock.listings.map((listing) => {
      const name = analyze(listing.name);
      return {
        id: listing.id,
        nameNorm: name.norm,
        nameWords: name.words,
        codeCompact: listing.code === null ? null : compact(listing.code),
      };
    }),
  };
}

let signatures = new WeakMap<SearchableStock[], string>();

function signatureOf(stocks: SearchableStock[]): string {
  const cached = signatures.get(stocks);
  if (cached !== undefined) return cached;

  const parts: string[] = [];
  for (const stock of stocks) {
    parts.push(stock.id, "\u0000", stock.productName, "\u0000");
    parts.push((stock.altNames ?? []).join("\u0001"), "\u0000");
    for (const listing of stock.listings) {
      parts.push(listing.id, "\u0000", listing.name, "\u0000", listing.code ?? "", "\u0002");
    }
    parts.push("\u0003");
  }

  const signature = parts.join("");
  signatures.set(stocks, signature);
  return signature;
}

export function buildStockIndex(stocks: SearchableStock[]): StockIndex {
  return { signature: signatureOf(stocks), entries: stocks.map(toEntry) };
}

let cache: { signature: string; index: StockIndex } | null = null;

/** Rebuilds only when a product/listing name, code, or alias changes. */
export function getStockIndex(stocks: SearchableStock[]): StockIndex {
  const signature = signatureOf(stocks);
  if (cache !== null && cache.signature === signature) return cache.index;
  const index = buildStockIndex(stocks);
  cache = { signature, index };
  return index;
}

export function resetStockIndex(): void {
  cache = null;
  signatures = new WeakMap();
}

/** Score every lot against `rawQuery`, highest first. */
export function searchStocks(index: StockIndex, rawQuery: string): StockHit[] {
  const query = norm(rawQuery);
  if (query === "") return [];

  const queryWords = query.split(" ");
  const queryCode = compact(rawQuery);
  const length = queryCode.length;
  const options: TextOptions = { tokenPrefix: length >= 2, weak: length >= 3 };
  const minimum = length <= 1 ? 7000 : length === 2 ? 5000 : 1500;

  const hits: StockHit[] = [];
  for (const entry of index.entries) {
    let best = 0;
    let bestListingId: string | null = null;
    let bestListingScore = 0;

    best = Math.max(
      best,
      gradeText(entry.productNorm, entry.productWords, query, queryWords, options) * FIELD.product,
    );

    for (const alt of entry.altNames) {
      best = Math.max(best, gradeText(alt.norm, alt.words, query, queryWords, options) * FIELD.alt);
    }

    for (const listing of entry.listings) {
      const name = gradeText(listing.nameNorm, listing.nameWords, query, queryWords, options);
      const code =
        listing.codeCompact === null ? 0 : gradeCode(listing.codeCompact, queryCode);
      const listingScore = Math.max(name * FIELD.listing, code * FIELD.code);
      // Track the best listing separately: a product-level match can win the
      // overall score while a listing still tells the card which code to show.
      if (listingScore > bestListingScore) {
        bestListingScore = listingScore;
        bestListingId = listing.id;
      }
      if (listingScore > best) best = listingScore;
    }

    if (best <= 0) continue;
    const score = Math.round(SCALE * best);
    if (score >= minimum) hits.push({ id: entry.id, score, listingId: bestListingId });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits;
}
