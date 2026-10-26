import { generateId } from "~/lib/random";
import type { ListingInput, ProductFull } from "~/services/product";

export type ListingDraft = {
  key: string;
  name: string;
  price: string;
  unit: string;
  kind: string;
  code: string;
};

export type StockDraft = {
  key: string;
  value: string;
  capital: string;
};

export type PropertyDraft = {
  key: string;
  name: string;
  value: string;
};

export type ProductNameDraft = {
  key: string;
  value: string;
};

export type ProductDraft = {
  name: string;
  note: string;
  listings: ListingDraft[];
  stocks: StockDraft[];
  properties: PropertyDraft[];
  productNames: ProductNameDraft[];
};

export const LISTING_KIND_SUGGESTIONS = ["retail", "wholesale", "marketplace"] as const;

export function newListing(): ListingDraft {
  return {
    key: generateId(),
    name: "",
    price: "",
    unit: "1",
    kind: "",
    code: "",
  };
}

export function newStock(): StockDraft {
  return { key: generateId(), value: "", capital: "" };
}

export function newProperty(): PropertyDraft {
  return { key: generateId(), name: "", value: "" };
}

export function newProductName(): ProductNameDraft {
  return { key: generateId(), value: "" };
}

export function emptyDraft(): ProductDraft {
  return {
    name: "",
    note: "",
    listings: [newListing()],
    stocks: [newStock()],
    properties: [],
    productNames: [],
  };
}

export function draftFromProduct(product: ProductFull): ProductDraft {
  return {
    name: product.name,
    note: product.note,
    listings: product.listings.map((listing) => ({
      key: listing.id,
      name: listing.name,
      price: String(listing.price),
      unit: String(listing.unit),
      kind: listing.kind,
      code: listing.code ?? "",
    })),
    stocks: product.stocks.map((stock) => ({
      key: stock.id,
      value: String(stock.value),
      capital: String(stock.capital),
    })),
    properties: product.properties.map((property) => ({
      key: property.id,
      name: property.key,
      value: property.value,
    })),
    productNames: product.productNames.map((name) => ({
      key: name.id,
      value: name.value,
    })),
  };
}

export function parseNumber(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/** A listing "has a code" exactly when the field is non-blank. */
export function toListingInput(listing: ListingDraft): ListingInput {
  const code = listing.code.trim();
  return {
    name: listing.name.trim(),
    price: parseNumber(listing.price),
    unit: Math.max(1, Math.trunc(parseNumber(listing.unit))),
    // Free label, and `""` is a legitimate value ("unlabelled"). The form only
    // suggests the known kinds; it does not require one.
    kind: listing.kind.trim(),
    code: code === "" ? null : code,
  };
}
