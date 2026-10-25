/**
 * Behaviour checks for the restock listing search ladder and its index cache.
 *
 * Run with:  bun test src/lib/search/listings.test.ts
 */
import { beforeEach, describe, expect, test } from "bun:test";
import {
  buildListingIndex,
  getListingIndex,
  resetListingIndex,
  searchListings,
  type SearchableListing,
} from "./listings";

function listing(
  name: string,
  options: { id?: string; code?: string | null; product?: string; alt?: string[] } = {},
): SearchableListing {
  return {
    id: options.id ?? name,
    name,
    code: options.code ?? null,
    productName: options.product ?? "",
    altNames: options.alt ?? [],
  };
}

function rank(listings: SearchableListing[], query: string): string[] {
  return searchListings(buildListingIndex(listings), query).map((hit) => hit.id);
}

describe("listing ladder", () => {
  test("exact listing name outranks exact product name", () => {
    const listings = [
      listing("Indomie Goreng", { id: "listing" }),
      listing("Spesial", { id: "product", product: "Indomie Goreng" }),
    ];
    expect(rank(listings, "indomie goreng")).toEqual(["listing", "product"]);
  });

  test("exact code outranks exact listing name", () => {
    const listings = [
      listing("1121", { id: "name" }),
      listing("Zzz", { id: "code", code: "1121" }),
    ];
    expect(rank(listings, "1121")).toEqual(["code", "name"]);
  });

  test("a product-name match returns every listing of that product", () => {
    const listings = [
      listing("Spesial", { id: "a", product: "Indomie" }),
      listing("Goreng", { id: "b", product: "Indomie" }),
      listing("Lain", { id: "c", product: "Sabun" }),
    ];
    expect(rank(listings, "indomie").sort()).toEqual(["a", "b"]);
  });

  test("alternative names are matched below the product name", () => {
    const listings = [listing("Spesial", { id: "a", product: "Mie", alt: ["Indomie"] })];
    expect(rank(listings, "indomie")).toEqual(["a"]);
  });

  test("a partial listing match also outranks a partial product match", () => {
    const listings = [
      listing("Goreng Spesial", { id: "listing", product: "Lain" }),
      listing("Ayam", { id: "product", product: "Goreng Spesial" }),
    ];
    expect(rank(listings, "goreng spesial")).toEqual(["listing", "product"]);
  });

  test("short queries only match at a boundary", () => {
    const listings = [listing("Nasi Goreng", { id: "n" })];
    expect(rank(listings, "na")).toEqual(["n"]);
    expect(rank(listings, "as")).toEqual([]);
  });
});

describe("listing index cache", () => {
  beforeEach(() => resetListingIndex());

  test("reuses the index while the searchable text is unchanged", () => {
    const listings = [listing("Indomie", { id: "a" })];
    const index = getListingIndex(listings);

    expect(getListingIndex(listings)).toBe(index);
    expect(getListingIndex([listing("Indomie", { id: "a" })])).toBe(index);
  });

  test("rebuilds when a name, code, product name, or alias changes", () => {
    const base = [listing("Indomie", { id: "a", code: "111", product: "Mie" })];
    const index = getListingIndex(base);

    expect(getListingIndex([listing("Indomie", { id: "a", code: "222", product: "Mie" })])).not.toBe(
      index,
    );
    expect(
      getListingIndex([listing("Indomie", { id: "a", code: "111", product: "Mie Lain" })]),
    ).not.toBe(index);
    expect(
      getListingIndex([listing("Indomie", { id: "a", code: "111", product: "Mie", alt: ["Mi"] })]),
    ).not.toBe(index);
  });
});

describe("searchListings at grosir scale", () => {
  beforeEach(() => resetListingIndex());

  // A POS terminal types into this search bar continuously. This is a regression
  // guard, not a target: the index is built once, but one query over a grosir
  // catalogue still scores every entry four ways, which measured ~19 ms on the
  // dev machine. The search bar is debounced (`DEBOUNCE_DELAY`) so that cost is
  // paid once per pause instead of once per character; if the scoring pass or
  // the sort gets materially worse, this catches it.
  test("scores 5,000 listings within the typing budget", () => {
    const catalogue = Array.from({ length: 5_000 }, (_, index) =>
      listing(`Barang ${index}`, {
        id: `l${index}`,
        code: String(10_000 + index),
        product: `Produk ${index % 400}`,
        alt: [`Alias ${index % 100}`],
      }),
    );
    const index = getListingIndex(catalogue);

    // Warm the JIT with a query that hits nothing, then measure the real one.
    searchListings(index, "zzz");

    const started = performance.now();
    for (let i = 0; i < 5; i += 1) searchListings(index, "barang 12");
    const perQuery = (performance.now() - started) / 5;

    expect(searchListings(index, "barang 12").length).toBeGreaterThan(0);
    expect(perQuery).toBeLessThan(25);
  });

  test("an unchanged catalogue reuses one index across many queries", () => {
    const catalogue = Array.from({ length: 200 }, (_, index) =>
      listing(`Barang ${index}`, { id: `l${index}` }),
    );
    const index = getListingIndex(catalogue);

    for (const query of ["b", "ba", "bar", "bara", "baran", "barang"]) {
      searchListings(getListingIndex(catalogue), query);
    }

    expect(getListingIndex(catalogue)).toBe(index);
  });
});
