import { describe, expect, test } from "bun:test";
import type { Combo } from "~/services/combo";
import type { Extra } from "~/services/extra";
import type { Listing } from "~/services/listing";
import type { ListState } from "./use-list-state";
import { filterCombos } from "./use-filtered";

function combo(
  id: string,
  name: string,
  options: { active?: boolean; listings?: string[]; extras?: string[]; updatedAt?: number } = {},
): Combo {
  return {
    id,
    name,
    active: options.active ?? true,
    cover: null,
    components: (options.listings ?? []).map((listingId, order) => ({
      id: `${id}-listing-${order}`,
      listingId,
      quantity: 1,
      order,
      discounts: [],
    })),
    extras: (options.extras ?? []).map((extraId, order) => ({
      id: `${id}-extra-${order}`,
      extraId,
      order,
    })),
    updatedAt: options.updatedAt ?? 0,
    syncAt: null,
  };
}

const listings: Listing[] = [
  {
    id: "listing-coffee",
    productId: "product-coffee",
    name: "Kopi susu",
    price: 12000,
    unit: 1,
    kind: "",
    code: null,
    cover: null,
    stock: 10,
    productName: "Kopi",
    altNames: ["coffee"],
  },
];
const extras: Extra[] = [
  { id: "extra-tax", name: "Pajak layanan", value: 10, kind: "percent", flag: 0, updatedAt: 0, syncAt: null },
];
const combos = [
  combo("coffee", "Paket kopi", { listings: ["listing-coffee"], extras: ["extra-tax"], updatedAt: 20 }),
  combo("tea", "Paket teh", { active: false, updatedAt: 10 }),
  combo("side", "Kopi dan roti", { listings: ["listing-coffee"], updatedAt: 30 }),
];
const base: ListState = {
  q: "",
  status: "all",
  contents: "all",
  sort: "name",
  dir: "asc",
  view: "grid",
  page: 1,
  size: 20,
};

function ids(state: Partial<ListState> = {}) {
  return filterCombos(combos, { ...base, ...state }, listings, extras).map((item) => item.id);
}

describe("filterCombos", () => {
  test("filters by active state and by whether a combo has listings or extras", () => {
    expect(ids({ status: "active" })).toEqual(["side", "coffee"]);
    expect(ids({ status: "inactive" })).toEqual(["tea"]);
    expect(ids({ contents: "listings" })).toEqual(["side", "coffee"]);
    expect(ids({ contents: "extras" })).toEqual(["coffee"]);
  });

  test("searches combo, listing and extra names without case or accent sensitivity", () => {
    expect(ids({ q: "kopi susu" })).toEqual(["side", "coffee"]);
    expect(ids({ q: "PAJAK layanan" })).toEqual(["coffee"]);
    expect(ids({ q: "paket teh" })).toEqual(["tea"]);
  });

  test("sorts by selected data and direction", () => {
    expect(ids({ sort: "updated", dir: "desc" })).toEqual(["side", "coffee", "tea"]);
    expect(ids({ sort: "listings", dir: "desc" })).toEqual(["side", "coffee", "tea"]);
    expect(ids({ sort: "name", dir: "desc" })).toEqual(["tea", "coffee", "side"]);
  });
});
