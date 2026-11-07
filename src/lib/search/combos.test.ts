import { describe, expect, test } from "bun:test";
import type { Combo } from "~/services/combo";
import type { Listing } from "~/services/listing";
import { searchCombos } from "./combos";

const listings: Listing[] = [
  {
    id: "l1",
    productId: "p1",
    name: "Mangkok 1 pcs",
    price: 2500,
    unit: 1,
    kind: "",
    code: null,
    cover: null,
    stock: 4,
    productName: "Mangkok Keramik",
    altNames: ["Mangkuk"],
  },
  {
    id: "l2",
    productId: "p2",
    name: "Sisir 1 pcs",
    price: 1500,
    unit: 1,
    kind: "",
    code: null,
    cover: null,
    stock: 8,
    productName: "Sisir",
    altNames: [],
  },
];

const combo: Combo = {
  id: "c1",
  name: "Paket Dapur",
  active: true,
  cover: null,
  components: [
    { id: "cl1", listingId: "l1", quantity: 1, order: 0 },
    { id: "cl2", listingId: "l2", quantity: 1, order: 1 },
  ],
  extras: [{ id: "ce1", extraId: "e1", order: 0 }],
  updatedAt: 1,
  syncAt: null,
};

describe("searchCombos", () => {
  test("matches the combo name and component listing/product names", () => {
    const extras = new Set(["e1"]);
    expect(searchCombos([combo], "paket dapur", listings, extras)).toEqual([combo]);
    expect(searchCombos([combo], "mangkuk", listings, extras)).toEqual([combo]);
    expect(searchCombos([combo], "sisir", listings, extras)).toEqual([combo]);
  });

  test("does not offer inactive or incomplete combos", () => {
    expect(searchCombos([{ ...combo, active: false }], "paket", listings, new Set(["e1"]))).toEqual([]);
    expect(searchCombos([combo], "paket", listings.slice(0, 1), new Set(["e1"]))).toEqual([]);
    expect(searchCombos([combo], "paket", listings, new Set())).toEqual([]);
  });

  test("does not return an empty-query combo result", () => {
    expect(searchCombos([combo], "  ", listings, new Set(["e1"]))).toEqual([]);
  });
});
