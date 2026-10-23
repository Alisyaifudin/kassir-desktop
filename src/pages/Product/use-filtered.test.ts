/**
 * Behaviour checks for `/products` filtering + sorting.
 *
 * Run with:  bun test src/pages/Product/use-filtered.test.ts
 */
import { beforeEach, describe, expect, test } from "bun:test";
import type { Product } from "~/services/product";
import { resetIndex } from "./search";
import { filterProducts } from "./use-filtered";
import type { ListState } from "./use-list-state";

function product(
  name: string,
  options: { id?: string; stock?: number; code?: string | null } = {},
): Product {
  const id = options.id ?? name;
  return {
    id,
    name,
    note: "",
    flag: 0,
    altNames: [],
    listings: [
      {
        id: `${id}-listing`,
        productId: id,
        name,
        price: 0,
        unit: 1,
        kind: "pcs",
        code: options.code ?? null,
        codeKind: options.code === null || options.code === undefined ? null : "barcode",
        updatedAt: 0,
        syncAt: null,
      },
    ],
    stock: options.stock ?? 10,
    capital: 0,
    cover: null,
    updatedAt: 0,
    syncAt: null,
  };
}

const base: ListState = {
  q: "",
  kinds: [],
  stock: "all",
  margin: "all",
  sort: "name",
  dir: "asc",
  view: "grid",
  page: 1,
  size: 20,
};

const products = [
  product("Nasi Goreng", { id: "a" }),
  product("Goreng Nasi", { id: "b" }),
  product("Nasi Ayam", { id: "c" }),
  product("Zzz", { id: "z" }),
];

describe("filterProducts", () => {
  beforeEach(() => resetIndex());

  test("a query keeps only the scored hits", () => {
    const result = filterProducts(products, { ...base, q: "nasi goreng", sort: "score" });
    expect(result.map((item) => item.id)).toEqual(["a", "b"]);
  });

  test("changing away from Skor re-sorts the same hits", () => {
    const score = filterProducts(products, { ...base, q: "nasi goreng", sort: "score" });
    const name = filterProducts(products, { ...base, q: "nasi goreng", sort: "name" });

    expect(score.map((item) => item.id)).toEqual(["a", "b"]);
    expect(name.map((item) => item.id)).toEqual(["b", "a"]);
    expect(new Set(name.map((item) => item.id))).toEqual(new Set(score.map((item) => item.id)));
  });

  test("direction still applies after the re-sort", () => {
    const result = filterProducts(products, {
      ...base,
      q: "nasi goreng",
      sort: "name",
      dir: "desc",
    });
    expect(result.map((item) => item.id)).toEqual(["a", "b"]);
  });

  test("structured filters still narrow the hits", () => {
    const stock = products.map((item) => (item.id === "b" ? { ...item, stock: 0 } : item));
    const result = filterProducts(stock, {
      ...base,
      q: "nasi goreng",
      sort: "score",
      stock: "out",
    });
    expect(result.map((item) => item.id)).toEqual(["b"]);
  });

  test("an empty query uses the chosen sort", () => {
    const result = filterProducts(products, base);
    expect(result.map((item) => item.id)).toEqual(["b", "c", "a", "z"]);
  });
});
