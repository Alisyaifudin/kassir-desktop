import { generateId } from "~/lib/random";
import type { CodeKind, ListingInput, ProductFull, ProductInput } from "~/services/product";

export type ListingDraft = {
  key: string;
  name: string;
  price: string;
  unit: string;
  kind: string;
  hasCode: boolean;
  code: string;
  codeKind: CodeKind;
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

export type ProductDraft = {
  name: string;
  note: string;
  listings: ListingDraft[];
  stocks: StockDraft[];
  properties: PropertyDraft[];
};

export const LISTING_KIND_SUGGESTIONS = ["retail", "wholesale", "marketplace"] as const;

export function newListing(): ListingDraft {
  return {
    key: generateId(),
    name: "",
    price: "",
    unit: "1",
    kind: "retail",
    hasCode: false,
    code: "",
    codeKind: "barcode",
  };
}

export function newStock(): StockDraft {
  return { key: generateId(), value: "", capital: "" };
}

export function newProperty(): PropertyDraft {
  return { key: generateId(), name: "", value: "" };
}

export function emptyDraft(): ProductDraft {
  return { name: "", note: "", listings: [newListing()], stocks: [newStock()], properties: [] };
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
      hasCode: listing.code !== null,
      code: listing.code ?? "",
      codeKind: listing.codeKind ?? "barcode",
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
  };
}

export function parseNumber(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function toListingInput(listing: ListingDraft): ListingInput {
  return {
    name: listing.name.trim(),
    price: parseNumber(listing.price),
    unit: Math.max(1, Math.trunc(parseNumber(listing.unit))),
    kind: listing.kind.trim() || "retail",
    code: listing.hasCode && listing.code.trim() !== "" ? listing.code.trim() : null,
    codeKind: listing.hasCode ? listing.codeKind : null,
  };
}

export type ProductDraftInput = ProductInput;
