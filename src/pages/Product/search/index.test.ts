/**
 * Behaviour checks for the product search ladder and its index cache.
 *
 * Run with:  bun test src/pages/Product/search/index.test.ts
 *
 * The tests assert the *ordering* the ladder promises rather than exact scores,
 * so the constants can be tuned without rewriting them.
 */
import { beforeEach, describe, expect, test } from "bun:test";
import type { Product } from "~/services/product";
import { buildIndex, getIndex, resetIndex, search, type CategoryName } from "./index";
import { norm } from "~/lib/search/normalize";
import { TEXT, gradeCode, gradeText } from "~/lib/search/quality";

function product(
  name: string,
  options: {
    id?: string;
    code?: string | null;
    alt?: string[];
    listing?: string;
    /** The category ids the product is filed under. */
    cats?: string[];
  } = {},
): Product {
  const id = options.id ?? name;
  return {
    id,
    name,
    note: "",
    flag: 0,
    altNames: options.alt ?? [],
    listings: [
      {
        id: `${id}-listing`,
        productId: id,
        name: options.listing ?? name,
        price: 0,
        unit: 1,
        kind: "pcs",
        code: options.code ?? null,
        updatedAt: 0,
        syncAt: null,
      },
    ],
    categoryIds: options.cats ?? [],
    stock: 0,
    capital: 0,
    maxCapital: 0,
    cover: null,
    updatedAt: 0,
    syncAt: null,
  };
}

function grade(name: string, query: string): number {
  const field = norm(name);
  const normalizedQuery = norm(query);
  return gradeText(field, field.split(" "), normalizedQuery, normalizedQuery.split(" "), {
    tokenPrefix: true,
    weak: true,
  });
}

function rank(products: Product[], query: string): string[] {
  return search(buildIndex(products), query).map((hit) => hit.id);
}

/** Rank with a category catalogue, which the index matches by name. */
function rankWith(
  products: Product[],
  query: string,
  categories: CategoryName[],
): string[] {
  return search(buildIndex(products, categories), query).map((hit) => hit.id);
}

describe("text ladder", () => {
  test("drops through the tiers in the agreed order", () => {
    expect(grade("Nasi Goreng", "nasi goreng")).toBe(TEXT.exact);
    expect(grade("Nasi Goreng", "goreng nasi")).toBe(TEXT.tokenSet);
    expect(grade("Nasi Goreng", "nas")).toBe(TEXT.prefix);
    expect(grade("Nasi Goreng", "gor nas")).toBe(TEXT.tokenPrefix);
    expect(grade("Nasi Goreng", "nsg")).toBe(TEXT.subsequence);
    expect(grade("Nasi Goreng", "nasi goremg")).toBeGreaterThan(0);
    expect(grade("Nasi Goreng", "nasi goremg")).toBeLessThan(TEXT.subsequence);
  });

  test("inner substring sits between token-prefix and subsequence", () => {
    expect(grade("Nasi Goreng", "asi")).toBeLessThan(TEXT.tokenPrefix);
    expect(grade("Nasi Goreng", "asi")).toBeGreaterThan(TEXT.subsequence);
  });
});

describe("typo tier", () => {
  test("accepts substitution, insertion, deletion, and transposition", () => {
    for (const query of ["nasi goremg", "nasi gorengg", "nasi goeng", "nasi gorneg"]) {
      const quality = grade("Nasi Goreng", query);
      expect(quality).toBeGreaterThan(0);
      expect(quality).toBeLessThanOrEqual(TEXT.typo);
      expect(quality).toBeLessThan(TEXT.subsequence);
    }
  });

  test("rejects two edits on a short token but accepts them on a long one", () => {
    expect(grade("Nasi Goreng", "nasi gxrxng")).toBe(0);
    expect(grade("Hyalurose Micellar", "hyelurosi")).toBeGreaterThan(0);
  });

  test("does not fuzzy-match short tokens or codes", () => {
    expect(grade("Nasi Goreng", "nasi nsi")).toBe(0);
    expect(rank([product("Noera", { id: "n", code: "1234567890" })], "1234567891")).toEqual([]);
  });

  test("a closer trigram overlap outranks a transposition", () => {
    expect(grade("Nasi Goreng", "nasi goremg")).toBeGreaterThan(
      grade("Nasi Goreng", "nasi gorneg"),
    );
  });
});

describe("code ladder", () => {
  const code = "90na1121010018391240930";

  test("exact outranks every partial match", () => {
    expect(gradeCode(code, code)).toBe(1);
    expect(gradeCode(code, "90na1121")).toBeGreaterThan(0);
    expect(gradeCode(code, "90na1121")).toBeLessThan(1);
  });

  test("a prefix beats a mid-string fragment", () => {
    expect(gradeCode(code, "90na1121")).toBeGreaterThan(gradeCode(code, "11210100183"));
  });
});

describe("search ranking", () => {
  test("exact code outranks an exact name", () => {
    const products = [
      product("Zzz", { id: "code", code: "1234567890" }),
      product("1234567890", { id: "name" }),
    ];
    expect(rank(products, "1234567890")).toEqual(["code", "name"]);
  });

  test("product name, then listing/alias, weighted by match quality", () => {
    const products = [
      product("Nasi Goreng", { id: "product" }),
      product("Zzz", { id: "alt", alt: ["Nasi Goreng"] }),
      product("Goreng Nasi", { id: "tokenset" }),
    ];
    expect(rank(products, "nasi goreng")).toEqual(["product", "alt", "tokenset"]);
  });

  test("keeps subsequence and typo matches alive", () => {
    expect(rank([product("Nasi Goreng", { id: "n" })], "nsg")).toEqual(["n"]);
    expect(rank([product("Nasi Goreng", { id: "n" })], "nasi goremg")).toEqual(["n"]);
  });

  test("does not fall back to subsequence for long or multi-token queries", () => {
    expect(rank([product("Pinkflash Foundation Medium Peach", { id: "p" })], "indomie")).toEqual([]);
    expect(
      rank([product("G2G Pomegranate Niacinamide Moist", { id: "g" })], "gor nas"),
    ).toEqual([]);
  });

  test("short queries only match at a boundary", () => {
    expect(rank([product("Nasi Goreng", { id: "n" })], "na")).toEqual(["n"]);
    expect(rank([product("Nasi Goreng", { id: "n" })], "as")).toEqual([]);
  });
});

describe("category field", () => {
  const categories = [
    { id: "c-minuman", name: "Minuman" },
    { id: "c-makanan", name: "Makanan" },
  ];

  test("a category name reaches everything filed under it", () => {
    const products = [
      product("Aqua", { id: "air", cats: ["c-minuman"] }),
      product("Indomie", { id: "mie", cats: ["c-makanan"] }),
    ];

    expect(rankWith(products, "minuman", categories)).toEqual(["air"]);
    expect(rankWith(products, "makanan", categories)).toEqual(["mie"]);
  });

  test("a name that says the same word outranks the shelf", () => {
    // The category is shared by the whole aisle, so it may lift a product into the
    // results but never above one actually called that.
    const products = [
      product("Aqua", { id: "shelf", cats: ["c-minuman"] }),
      product("Minuman", { id: "named" }),
    ];

    expect(rankWith(products, "minuman", categories)).toEqual(["named", "shelf"]);
  });

  test("a category the catalogue cannot name indexes nothing", () => {
    // A link this device has not received yet: there is no text to match, and an
    // id must never become searchable text of its own.
    const products = [product("Aqua", { id: "air", cats: ["c-minuman"] })];

    expect(rankWith(products, "minuman", [])).toEqual([]);
    expect(rankWith(products, "c-minuman", categories)).toEqual([]);
  });
});

describe("index cache", () => {
  beforeEach(() => resetIndex());

  test("reuses the index while the indexed text is unchanged", () => {
    const products = [product("Nasi Goreng", { id: "n" })];
    const first = getIndex(products);

    expect(getIndex(products)).toBe(first);
    expect(getIndex([product("Nasi Goreng", { id: "n" })])).toBe(first);

    const nonIndexed = [{ ...products[0], stock: 99, capital: 10, note: "x", updatedAt: 5 }];
    expect(getIndex(nonIndexed)).toBe(first);
  });

  test("rebuilds on edit, delete, and insert", () => {
    const first = getIndex([product("Nasi Goreng", { id: "n" }), product("Ayam", { id: "a" })]);

    const renamed = [product("Nasi Ayam", { id: "n" }), product("Ayam", { id: "a" })];
    const second = getIndex(renamed);
    expect(second).not.toBe(first);

    const removed = [product("Nasi Ayam", { id: "n" })];
    const third = getIndex(removed);
    expect(third).not.toBe(second);

    const added = [...removed, product("Baru", { id: "b" })];
    const fourth = getIndex(added);
    expect(fourth).not.toBe(third);
  });

  test("rebuilds when a listing code or alias changes", () => {
    const base = [product("X", { id: "x", code: "111" })];
    const first = getIndex(base);
    expect(getIndex([product("X", { id: "x", code: "222" })])).not.toBe(first);

    const second = getIndex(base);
    expect(getIndex([product("X", { id: "x", code: "111", alt: ["Y"] })])).not.toBe(second);
  });

  test("rebuilds when a category is renamed, though no product row moved", () => {
    const products = [product("Aqua", { id: "air", cats: ["c-minuman"] })];
    const first = getIndex(products, [{ id: "c-minuman", name: "Minuman" }]);

    // Same names in a fresh array: the signature matches, so the index is kept.
    expect(getIndex(products, [{ id: "c-minuman", name: "Minuman" }])).toBe(first);

    const renamed = getIndex(products, [{ id: "c-minuman", name: "Minuman Dingin" }]);
    expect(renamed).not.toBe(first);
  });
});
