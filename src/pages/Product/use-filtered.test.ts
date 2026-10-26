/**
 * Behaviour checks for `/products` filtering + sorting.
 *
 * Run with:  bun test src/pages/Product/use-filtered.test.ts
 */
import { beforeEach, describe, expect, test } from "bun:test";
import type { Product } from "~/services/product";
import { PRODUCT_FLAG_UNPUBLISHED } from "~/services/product";
import { resetIndex } from "./search";
import { filterProducts } from "./use-filtered";
import type { ListState } from "./use-list-state";

function product(
  name: string,
  options: {
    id?: string;
    stock?: number;
    code?: string | null;
    capital?: number;
    maxCapital?: number;
    flag?: number;
  } = {},
): Product {
  const id = options.id ?? name;
  return {
    id,
    name,
    note: "",
    flag: options.flag ?? 0,
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
        updatedAt: 0,
        syncAt: null,
      },
    ],
    stock: options.stock ?? 10,
    capital: options.capital ?? 0,
    maxCapital: options.maxCapital ?? 0,
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
  publish: "all",
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

  test("sorting by Modal uses the highest lot, the number the views print", () => {
    // `capital` (the old average) and `maxCapital` disagree on purpose: sorting by
    // the average while showing the highest looks like a broken sort.
    const mixed = [
      product("A", { id: "a", capital: 900, maxCapital: 900 }),
      product("B", { id: "b", capital: 500, maxCapital: 1_200 }),
    ];

    const ascending = filterProducts(mixed, { ...base, sort: "capital" });
    const descending = filterProducts(mixed, { ...base, sort: "capital", dir: "desc" });

    // 900 then 1.200. The old average-based sort ordered these the other way
    // round (b averaged 500), which is the disagreement this pins.
    expect(ascending.map((item) => item.id)).toEqual(["a", "b"]);
    expect(descending.map((item) => item.id)).toEqual(["b", "a"]);
  });

  test("an empty query uses the chosen sort", () => {
    const result = filterProducts(products, base);
    expect(result.map((item) => item.id)).toEqual(["b", "c", "a", "z"]);
  });

  test("publish narrows to what the till can (or cannot) sell", () => {
    const mixed = [
      product("Alpha", { id: "published" }),
      product("Beta", { id: "unpublished", flag: PRODUCT_FLAG_UNPUBLISHED }),
    ];
    const ids = (publish: ListState["publish"]) =>
      filterProducts(mixed, { ...base, publish }).map((item) => item.id);

    expect(ids("all")).toEqual(["published", "unpublished"]);
    expect(ids("published")).toEqual(["published"]);
    expect(ids("unpublished")).toEqual(["unpublished"]);
  });

  test("publish is a mask, not an equality: another flag bit does not unpublish", () => {
    // Bit 1 is unused today, but `flag` is a bitfield: a product carrying it is
    // still published, and an `=== 0` check would wrongly bury it under Terbit.
    const mixed = [
      product("Alpha", { id: "published", flag: 0b10 }),
      product("Beta", { id: "unpublished", flag: PRODUCT_FLAG_UNPUBLISHED | 0b10 }),
    ];

    expect(
      filterProducts(mixed, { ...base, publish: "published" }).map((item) => item.id),
    ).toEqual(["published"]);
  });
});
