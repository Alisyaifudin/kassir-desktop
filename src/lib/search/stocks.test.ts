/**
 * Behaviour checks for the stock-lot search used by the record detail dialog.
 *
 * Run with:  bun test src/lib/search/stocks.test.ts
 */
import { beforeEach, describe, expect, test } from "bun:test";
import {
  buildStockIndex,
  getStockIndex,
  resetStockIndex,
  searchStocks,
  type SearchableStock,
} from "./stocks";

function stock(
  id: string,
  product: string,
  options: {
    alt?: string[];
    listings?: { id: string; name: string; code: string | null }[];
  } = {},
): SearchableStock {
  const listings = options.listings ?? [{ id: `${id}-listing`, name: product, code: null }];
  return {
    id,
    productId: product,
    productName: product,
    altNames: options.alt ?? [],
    listings: listings.map((listing) => ({ ...listing, price: 0, unit: 1 })),
  };
}

function rank(stocks: SearchableStock[], query: string): string[] {
  return searchStocks(buildStockIndex(stocks), query).map((hit) => hit.id);
}

describe("stock ladder", () => {
  test("the product name outranks a listing name", () => {
    const stocks = [
      stock("listing", "Zzz", {
        listings: [{ id: "l1", name: "Indomie Goreng", code: null }],
      }),
      stock("product", "Indomie Goreng"),
    ];
    expect(rank(stocks, "indomie goreng")).toEqual(["product", "listing"]);
  });

  test("a product match returns every lot of that product", () => {
    const stocks = [stock("a", "Indomie"), stock("b", "Indomie"), stock("c", "Sabun")];
    expect(rank(stocks, "indomie").sort()).toEqual(["a", "b"]);
  });

  test("a code match reports the listing it matched", () => {
    const stocks = [
      stock("a", "Noera", {
        listings: [{ id: "l1", name: "Noera 100ml", code: "112233" }],
      }),
    ];
    const hits = searchStocks(buildStockIndex(stocks), "112233");
    expect(hits[0]?.id).toBe("a");
    expect(hits[0]?.listingId).toBe("l1");
  });

  test("aliases match", () => {
    const stocks = [stock("a", "Mie", { alt: ["Indomie"] })];
    expect(rank(stocks, "indomie")).toEqual(["a"]);
  });
});

describe("stock index cache", () => {
  beforeEach(() => resetStockIndex());

  test("reuses the index while the searchable text is unchanged", () => {
    const first = [stock("a", "Indomie")];
    const index = getStockIndex(first);

    expect(getStockIndex(first)).toBe(index);
    expect(getStockIndex([stock("a", "Indomie")])).toBe(index);
    expect(getStockIndex([stock("a", "Indomie Baru")])).not.toBe(index);
  });
});
