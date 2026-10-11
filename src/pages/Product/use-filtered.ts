import type { Product } from "~/services/product";
import { LOW_STOCK_THRESHOLD, type ListState } from "./use-list-state";

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

function matches(product: Product, query: string): boolean {
  if (product.name.toLowerCase().includes(query)) return true;
  if (product.note.toLowerCase().includes(query)) return true;
  return product.listings.some(
    (listing) =>
      listing.name.toLowerCase().includes(query) ||
      (listing.code?.toLowerCase().includes(query) ?? false),
  );
}

export function filterProducts(products: Product[], state: ListState): Product[] {
  const query = state.q.trim().toLowerCase();
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
  if (query !== "") {
    result = result.filter((product) => matches(product, query));
  }

  const sorted = [...result].sort((a, b) => {
    switch (state.sort) {
      case "price":
        return minPrice(a) - minPrice(b);
      case "capital":
        return a.capital - b.capital;
      case "stock":
        return a.stock - b.stock;
      case "updated":
        return a.updatedAt - b.updatedAt;
      case "name":
      default:
        return a.name.localeCompare(b.name);
    }
  });

  return state.dir === "desc" ? sorted.reverse() : sorted;
}
