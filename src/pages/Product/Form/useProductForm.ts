import { useCallback, useState } from "react";
import type { ProductInput } from "~/services/product";
import {
  emptyDraft,
  newListing,
  newProperty,
  newStock,
  parseNumber,
  toListingInput,
  type ListingDraft,
  type ProductDraft,
  type PropertyDraft,
  type StockDraft,
} from "./types";

export type ProductFormErrors = {
  name?: string;
  listings?: string;
  listingErrors?: Record<string, { name?: string; price?: string; unit?: string }>;
  stocks?: string;
  stockErrors?: Record<string, { value?: string; capital?: string }>;
  propertyErrors?: Record<string, { name?: string }>;
};

function computeErrors(draft: ProductDraft): ProductFormErrors {
  const next: ProductFormErrors = {};

  if (draft.name.trim() === "") next.name = "Nama produk wajib diisi.";

  if (draft.listings.length === 0) {
    next.listings = "Minimal satu listing.";
  } else {
    const listingErrors: NonNullable<ProductFormErrors["listingErrors"]> = {};
    for (const listing of draft.listings) {
      const row: { name?: string; price?: string; unit?: string } = {};
      if (listing.name.trim() === "") row.name = "Nama listing wajib diisi.";
      if (listing.price.trim() === "" || parseNumber(listing.price) < 0) {
        row.price = "Harga tidak valid.";
      }
      const unit = parseNumber(listing.unit);
      if (!Number.isInteger(unit) || unit < 1) row.unit = "Satuan minimal 1.";
      if (listing.hasCode && listing.code.trim() === "") row.name ??= "Kode wajib diisi.";
      if (Object.keys(row).length > 0) listingErrors[listing.key] = row;
    }
    if (Object.keys(listingErrors).length > 0) next.listingErrors = listingErrors;
  }

  if (draft.stocks.length === 0) {
    next.stocks = "Minimal satu stok.";
  } else {
    const stockErrors: NonNullable<ProductFormErrors["stockErrors"]> = {};
    for (const stock of draft.stocks) {
      const row: { value?: string; capital?: string } = {};
      if (stock.value.trim() === "" || parseNumber(stock.value) < 0) row.value = "Jumlah tidak valid.";
      if (stock.capital.trim() === "" || parseNumber(stock.capital) < 0) {
        row.capital = "Modal tidak valid.";
      }
      if (Object.keys(row).length > 0) stockErrors[stock.key] = row;
    }
    if (Object.keys(stockErrors).length > 0) next.stockErrors = stockErrors;
  }

  const propertyErrors: NonNullable<ProductFormErrors["propertyErrors"]> = {};
  const seen = new Set<string>();
  for (const property of draft.properties) {
    const row: { name?: string } = {};
    const key = property.name.trim().toLowerCase();
    if (key === "") row.name = "Kunci wajib diisi.";
    else if (seen.has(key)) row.name = "Kunci sudah dipakai.";
    else seen.add(key);
    if (Object.keys(row).length > 0) propertyErrors[property.key] = row;
  }
  if (Object.keys(propertyErrors).length > 0) next.propertyErrors = propertyErrors;

  return next;
}

function hasErrors(errors: ProductFormErrors): boolean {
  return Boolean(
    errors.name ||
      errors.listings ||
      errors.stocks ||
      errors.listingErrors ||
      errors.stockErrors ||
      errors.propertyErrors,
  );
}

export function buildProductInput(draft: ProductDraft): ProductInput {
  return {
    name: draft.name.trim(),
    note: draft.note,
    listings: draft.listings.map(toListingInput),
    stocks: draft.stocks.map((stock) => ({
      value: Math.max(0, Math.round(parseNumber(stock.value))),
      capital: parseNumber(stock.capital),
    })),
    properties: draft.properties.map((property) => ({
      key: property.name.trim(),
      value: property.value,
    })),
  };
}

export function useProductForm(initial?: ProductDraft) {
  const [draft, setDraft] = useState<ProductDraft>(() => initial ?? emptyDraft());
  const [errors, setErrors] = useState<ProductFormErrors>({});

  const setName = useCallback((name: string) => setDraft((d) => ({ ...d, name })), []);
  const setNote = useCallback((note: string) => setDraft((d) => ({ ...d, note })), []);

  const addListing = useCallback(
    () => setDraft((d) => ({ ...d, listings: [...d.listings, newListing()] })),
    [],
  );
  const removeListing = useCallback(
    (key: string) =>
      setDraft((d) =>
        d.listings.length <= 1 ? d : { ...d, listings: d.listings.filter((l) => l.key !== key) },
      ),
    [],
  );
  const updateListing = useCallback(
    (key: string, patch: Partial<ListingDraft>) =>
      setDraft((d) => ({
        ...d,
        listings: d.listings.map((l) => (l.key === key ? { ...l, ...patch } : l)),
      })),
    [],
  );

  const addStock = useCallback(
    () => setDraft((d) => ({ ...d, stocks: [...d.stocks, newStock()] })),
    [],
  );
  const removeStock = useCallback(
    (key: string) =>
      setDraft((d) =>
        d.stocks.length <= 1 ? d : { ...d, stocks: d.stocks.filter((s) => s.key !== key) },
      ),
    [],
  );
  const updateStock = useCallback(
    (key: string, patch: Partial<StockDraft>) =>
      setDraft((d) => ({
        ...d,
        stocks: d.stocks.map((s) => (s.key === key ? { ...s, ...patch } : s)),
      })),
    [],
  );

  const addProperty = useCallback(
    () => setDraft((d) => ({ ...d, properties: [...d.properties, newProperty()] })),
    [],
  );
  const removeProperty = useCallback(
    (key: string) =>
      setDraft((d) => ({ ...d, properties: d.properties.filter((p) => p.key !== key) })),
    [],
  );
  const updateProperty = useCallback(
    (key: string, patch: Partial<PropertyDraft>) =>
      setDraft((d) => ({
        ...d,
        properties: d.properties.map((p) => (p.key === key ? { ...p, ...patch } : p)),
      })),
    [],
  );

  const validate = useCallback((): boolean => {
    const next = computeErrors(draft);
    setErrors(next);
    return !hasErrors(next);
  }, [draft]);

  const buildInput = useCallback((): ProductInput | null => {
    if (!validate()) return null;
    return buildProductInput(draft);
  }, [draft, validate]);

  const reset = useCallback((next: ProductDraft) => {
    setDraft(next);
    setErrors({});
  }, []);

  return {
    draft,
    errors,
    setName,
    setNote,
    addListing,
    removeListing,
    updateListing,
    addStock,
    removeStock,
    updateStock,
    addProperty,
    removeProperty,
    updateProperty,
    validate,
    buildInput,
    reset,
  } as const;
}

export type ProductFormController = ReturnType<typeof useProductForm>;
