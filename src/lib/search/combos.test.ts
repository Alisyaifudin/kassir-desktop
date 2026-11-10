import { describe, expect, test } from "bun:test";
import type { Combo } from "~/services/combo";
import type { Extra } from "~/services/extra";
import type { Listing } from "~/services/listing";
import { buildComboIndex, COMBO_FIELD, searchCombos, type ComboContext } from "./combos";
import { buildListingIndex, searchListings } from "./listings";

function listing(
  id: string,
  name: string,
  productName: string,
  altNames: string[] = [],
  code: string | null = null,
): Listing {
  return {
    id,
    productId: `p-${id}`,
    name,
    price: 2500,
    unit: 1,
    kind: "",
    code,
    cover: null,
    stock: 4,
    productName,
    altNames,
  };
}

const extras: Extra[] = [
  {
    id: "e1",
    name: "Pajak",
    value: 10,
    kind: "percent",
    flag: 1,
    updatedAt: 1,
    syncAt: null,
  },
];

const listings: Listing[] = [
  listing("l1", "Mangkok 1 pcs", "Mangkok Keramik", ["Mangkuk"]),
  listing("l2", "Sisir 1 pcs", "Sisir"),
];

const combo: Combo = {
  id: "c1",
  name: "Paket Dapur",
  active: true,
  cover: null,
  components: [
    { id: "cl1", listingId: "l1", quantity: 1, order: 0, discounts: [] },
    { id: "cl2", listingId: "l2", quantity: 1, order: 1, discounts: [] },
  ],
  extras: [{ id: "ce1", extraId: "e1", order: 0 }],
  updatedAt: 1,
  syncAt: null,
};

const context: ComboContext = { listings, extras };

function ids(hits: { id: string }[]): string[] {
  return hits.map((hit) => hit.id);
}

function score(hits: { id: string; score: number }[], id: string): number {
  return hits.find((hit) => hit.id === id)?.score ?? 0;
}

describe("searchCombos", () => {
  const index = buildComboIndex([combo], context);

  test("matches the combo name and component listing/product names", () => {
    expect(ids(searchCombos(index, "paket dapur"))).toEqual(["c1"]);
    expect(ids(searchCombos(index, "mangkuk"))).toEqual(["c1"]);
    expect(ids(searchCombos(index, "sisir"))).toEqual(["c1"]);
  });

  test("does not offer inactive or incomplete combos", () => {
    expect(
      ids(searchCombos(buildComboIndex([{ ...combo, active: false }], context), "paket")),
    ).toEqual([]);
    expect(
      ids(
        searchCombos(
          buildComboIndex([combo], { ...context, listings: listings.slice(0, 1) }),
          "paket",
        ),
      ),
    ).toEqual([]);
    expect(
      ids(searchCombos(buildComboIndex([combo], { ...context, extras: [] }), "paket")),
    ).toEqual([]);
  });

  test("does not return an empty-query combo result", () => {
    expect(searchCombos(index, "  ")).toEqual([]);
  });

  test("an exact name outranks a fuzzily matched component name", () => {
    const hits = searchCombos(index, "paket dapur");
    expect(hits).toHaveLength(1);

    // The same combo reached through a component is a weaker answer than its own
    // name: the operator typed the bundle, not one of the goods inside it.
    const byComponent = searchCombos(index, "mangkuk");
    expect(score(byComponent, "c1")).toBeLessThan(score(hits, "c1"));
    expect(score(byComponent, "c1")).toBe(Math.round(Math.round(9999 * COMBO_FIELD.alt)));
  });
});

describe("combos and listings share one relevance scale", () => {
  // `nasi` is a subsequence of `hanasui`, the case that buried a `Nasi` combo
  // under a screenful of cosmetics: the exact combo name has to come first.
  const catalog: Listing[] = [
    listing("h1", "Hanasui Hijau", "Hanasui"),
    listing("h2", "Hanasui Setting Spray", "Hanasui"),
  ];
  const nasi: Combo = {
    id: "c-nasi",
    name: "Nasi",
    active: true,
    cover: null,
    components: [{ id: "cl-nasi", listingId: "h1", quantity: 1, order: 0, discounts: [] }],
    extras: [],
    updatedAt: 1,
    syncAt: null,
  };
  const combos: ComboContext = { listings: catalog, extras: [] };

  test("a perfect combo name scores above every fuzzy listing hit", () => {
    const listingHits = searchListings(buildListingIndex(catalog), "nasi");
    const comboHits = searchCombos(buildComboIndex([nasi], combos), "nasi");

    expect(listingHits.length).toBeGreaterThan(0);
    expect(comboHits).toHaveLength(1);
    // The merged list the cart builds: one scale, highest first.
    const merged = [...listingHits, ...comboHits].sort((left, right) => right.score - left.score);
    expect(merged[0]?.id).toBe("c-nasi");
  });

  test("an exact listing name still wins a tie with an exact combo name", () => {
    const named: Listing[] = [listing("h3", "Nasi", "Nasi")];
    const listingHits = searchListings(buildListingIndex(named), "nasi");
    const comboHits = searchCombos(
      buildComboIndex([{ ...nasi, components: [] }], { listings: named, extras: [] }),
      "nasi",
    );

    expect(score(listingHits, "h3")).toBeGreaterThan(score(comboHits, "c-nasi"));
  });
});
