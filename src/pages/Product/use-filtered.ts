import type { Product } from "~/services/product";
import { getProductKind } from "~/lib/constants";
import { LOW_STOCK_THRESHOLD, type ListState, type SortBy } from "./use-list-state";
import { getIndex, search } from "./search";

export type StockStatus = "in" | "low" | "out";

export function stockStatus(product: Product): StockStatus {
  if (product.stock <= 0) return "out";
  if (product.stock <= LOW_STOCK_THRESHOLD) return "low";
  return "in";
}

/**
 * True when any listing is sold at or below the weighted-average capital.
 * `listing.price` is the price of a whole `unit` bundle while `product.capital`
 * is per pcs, so both sides are normalised to per pcs before comparing.
 */
export function isLoss(product: Product): boolean {
  if (product.listings.length === 0) return false;
  return product.listings.some(
    (listing) => listing.unit > 0 && listing.price / listing.unit <= product.capital,
  );
}

export function minPrice(product: Product): number {
  if (product.listings.length === 0) return 0;
  return Math.min(...product.listings.map((listing) => listing.price));
}

export function maxPrice(product: Product): number {
  if (product.listings.length === 0) return 0;
  return Math.max(...product.listings.map((listing) => listing.price));
}

function compare(a: Product, b: Product, sort: SortBy): number {
  switch (sort) {
    case "price":
      return minPrice(a) - minPrice(b);
    case "capital":
      // The column's number, not `capital`: sorting by one figure while showing
      // another is a sort that looks broken.
      return a.maxCapital - b.maxCapital;
    case "stock":
      return a.stock - b.stock;
    case "updated":
      return a.updatedAt - b.updatedAt;
    case "score":
    case "name":
    default:
      return a.name.localeCompare(b.name);
  }
}

function bySort(products: Product[], sort: SortBy, dir: ListState["dir"]): Product[] {
  const sorted = [...products].sort((a, b) => compare(a, b, sort));
  return dir === "desc" ? sorted.reverse() : sorted;
}

export function filterProducts(products: Product[], state: ListState): Product[] {
  const query = state.q.trim();
  let result = products;

  if (state.kinds.length > 0) {
    result = result.filter((product) =>
      product.listings.some((listing) => state.kinds.includes(listing.kind)),
    );
  }
  if (state.stock !== "all") {
    result = result.filter((product) => stockStatus(product) === state.stock);
  }
  if (state.margin !== "all") {
    const wantLoss = state.margin === "loss";
    result = result.filter((product) => isLoss(product) === wantLoss);
  }

  // A query ranks by relevance; the structured filters still narrow the set,
  // and the index is reused until a product's searchable text changes.
  if (query !== "") {
    const byId = new Map(result.map((product) => [product.id, product]));
    const matched: Product[] = [];
    for (const hit of search(getIndex(products), query)) {
      const product = byId.get(hit.id);
      if (product !== undefined) matched.push(product);
    }
    // `Skor` keeps the relevance order; any other choice re-sorts the same hits.
    return state.sort === "score" ? matched : bySort(matched, state.sort, state.dir);
  }

  return bySort(result, state.sort, state.dir);
}

/**
 * Every `kind` label the catalog actually uses, sorted by display name.
 *
 * Read by the filter popover, which is the only consumer — a page must not
 * compute it "just in case" and hand it down.
 */
export function availableKinds(products: Product[]): string[] {
  const kinds = new Set<string>();
  for (const product of products) {
    for (const listing of product.listings) {
      // `kind` is a free label defaulting to ''; an unlabelled listing must not
      // add a blank checkbox to the filter.
      if (listing.kind !== "") kinds.add(listing.kind);
    }
  }
  // Sorted by display label, since the filter renders `getProductKind(kind)`.
  return [...kinds].sort((a, b) => getProductKind(a).localeCompare(getProductKind(b)));
}
