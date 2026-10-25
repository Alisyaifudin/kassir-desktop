import { useCallback, useRef, useState } from "react";
import type { ProductInput } from "~/services/product";
import {
  emptyDraft,
  newListing,
  newProductName,
  newProperty,
  newStock,
  parseNumber,
  toListingInput,
  type ListingDraft,
  type ProductDraft,
  type ProductNameDraft,
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
  productNameErrors?: Record<string, { value?: string }>;
};

/** Same-field edits closer than this merge into one undo step. */
const COALESCE_MS = 600;
const HISTORY_LIMIT = 100;

type FormState = {
  draft: ProductDraft;
  past: ProductDraft[];
  future: ProductDraft[];
  /** Field the last edit touched, or `null` when it must stand alone. */
  lastKey: string | null;
  lastAt: number;
};

/** Coalescing key for a patch — only a single-field write can merge. */
function patchKey(prefix: string, patch: object): string | null {
  const keys = Object.keys(patch);
  return keys.length === 1 ? `${prefix}:${keys[0]}` : null;
}

/**
 * Overlay the latest persisted-lot quantities onto a draft. Lots that are not in
 * `lots` (unsaved "Tambah lot" rows) and every `capital` stay untouched.
 */
function applyStockSync(
  draft: ProductDraft,
  lots: readonly { id: string; value: number }[],
): ProductDraft {
  if (lots.length === 0) return draft;
  const byId = new Map(lots.map((lot) => [lot.id, String(lot.value)]));
  let changed = false;
  const stocks = draft.stocks.map((stock) => {
    const value = byId.get(stock.key);
    if (value === undefined || value === stock.value) return stock;
    changed = true;
    return { ...stock, value };
  });
  return changed ? { ...draft, stocks } : draft;
}

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

  const productNameErrors: NonNullable<ProductFormErrors["productNameErrors"]> = {};
  const seenNames = new Set<string>();
  for (const productName of draft.productNames) {
    const row: { value?: string } = {};
    const value = productName.value.trim().toLowerCase();
    if (value === "") row.value = "Nama alternatif wajib diisi.";
    else if (seenNames.has(value)) row.value = "Nama alternatif sudah dipakai.";
    else seenNames.add(value);
    if (Object.keys(row).length > 0) productNameErrors[productName.key] = row;
  }
  if (Object.keys(productNameErrors).length > 0) next.productNameErrors = productNameErrors;

  return next;
}

function hasErrors(errors: ProductFormErrors): boolean {
  return Boolean(
    errors.name ||
      errors.listings ||
      errors.stocks ||
      errors.listingErrors ||
      errors.stockErrors ||
      errors.propertyErrors ||
      errors.productNameErrors,
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

/**
 * Product draft state with in-memory undo/redo.
 *
 * History lives entirely in this hook — nothing is persisted, and undoing only
 * rolls the draft back. Edits to the same field inside `COALESCE_MS` collapse
 * into one step, so a typed word costs one undo; adding or removing a row always
 * stands alone.
 */
export function useProductForm(initial?: ProductDraft) {
  const [state, setState] = useState<FormState>(() => ({
    draft: initial ?? emptyDraft(),
    past: [],
    future: [],
    lastKey: null,
    lastAt: 0,
  }));
  const [errors, setErrors] = useState<ProductFormErrors>({});

  // Latest persisted-lot quantities (external truth). Re-applied on undo/redo so
  // an immediate stock adjustment is never rolled back to a stale draft value —
  // that write is not part of the draft history.
  const syncedLots = useRef<readonly { id: string; value: number }[]>([]);

  const { draft } = state;

  /** Commit an edit; a non-null `key` lets a same-field burst merge into it. */
  const edit = useCallback(
    (key: string | null, updater: (draft: ProductDraft) => ProductDraft) => {
      const at = Date.now();
      setState((s) => {
        const next = updater(s.draft);
        if (next === s.draft) return s;
        if (key !== null && s.lastKey === key && at - s.lastAt < COALESCE_MS) {
          return { ...s, draft: next, lastAt: at };
        }
        return {
          draft: next,
          past: [...s.past, s.draft].slice(-HISTORY_LIMIT),
          future: [],
          lastKey: key,
          lastAt: at,
        };
      });
    },
    [],
  );

  const setName = useCallback((name: string) => edit("name", (d) => ({ ...d, name })), [edit]);
  const setNote = useCallback((note: string) => edit("note", (d) => ({ ...d, note })), [edit]);

  const addListing = useCallback(
    () => edit(null, (d) => ({ ...d, listings: [...d.listings, newListing()] })),
    [edit],
  );
  const removeListing = useCallback(
    (key: string) =>
      edit(null, (d) =>
        d.listings.length <= 1 ? d : { ...d, listings: d.listings.filter((l) => l.key !== key) },
      ),
    [edit],
  );
  const updateListing = useCallback(
    (key: string, patch: Partial<ListingDraft>) =>
      edit(patchKey(`listing:${key}`, patch), (d) => ({
        ...d,
        listings: d.listings.map((l) => (l.key === key ? { ...l, ...patch } : l)),
      })),
    [edit],
  );

  const addStock = useCallback(
    () => edit(null, (d) => ({ ...d, stocks: [...d.stocks, newStock()] })),
    [edit],
  );
  const removeStock = useCallback(
    (key: string) =>
      edit(null, (d) =>
        d.stocks.length <= 1 ? d : { ...d, stocks: d.stocks.filter((s) => s.key !== key) },
      ),
    [edit],
  );
  const updateStock = useCallback(
    (key: string, patch: Partial<StockDraft>) =>
      edit(patchKey(`stock:${key}`, patch), (d) => ({
        ...d,
        stocks: d.stocks.map((s) => (s.key === key ? { ...s, ...patch } : s)),
      })),
    [edit],
  );

  /**
   * Refresh persisted lots' quantities from the source of truth (e.g. after an
   * immediate stock adjustment). Deliberately outside the history: it is not a
   * user edit, so it must not become an undo step or be rolled back.
   */
  const syncStockValues = useCallback((lots: readonly { id: string; value: number }[]) => {
    syncedLots.current = lots;
    setState((s) => {
      const draft = applyStockSync(s.draft, lots);
      return draft === s.draft ? s : { ...s, draft };
    });
  }, []);

  const addProperty = useCallback(
    () => edit(null, (d) => ({ ...d, properties: [...d.properties, newProperty()] })),
    [edit],
  );
  const removeProperty = useCallback(
    (key: string) =>
      edit(null, (d) => ({ ...d, properties: d.properties.filter((p) => p.key !== key) })),
    [edit],
  );
  const updateProperty = useCallback(
    (key: string, patch: Partial<PropertyDraft>) =>
      edit(patchKey(`property:${key}`, patch), (d) => ({
        ...d,
        properties: d.properties.map((p) => (p.key === key ? { ...p, ...patch } : p)),
      })),
    [edit],
  );

  const addProductName = useCallback(
    () => edit(null, (d) => ({ ...d, productNames: [...d.productNames, newProductName()] })),
    [edit],
  );
  const removeProductName = useCallback(
    (key: string) =>
      edit(null, (d) => ({
        ...d,
        productNames: d.productNames.filter((n) => n.key !== key),
      })),
    [edit],
  );
  const updateProductName = useCallback(
    (key: string, patch: Partial<ProductNameDraft>) =>
      edit(patchKey(`productName:${key}`, patch), (d) => ({
        ...d,
        productNames: d.productNames.map((n) => (n.key === key ? { ...n, ...patch } : n)),
      })),
    [edit],
  );

  const undo = useCallback(() => {
    setErrors({});
    setState((s) => {
      const previous = s.past[s.past.length - 1];
      if (previous === undefined) return s;
      return {
        draft: applyStockSync(previous, syncedLots.current),
        past: s.past.slice(0, -1),
        future: [s.draft, ...s.future].slice(0, HISTORY_LIMIT),
        lastKey: null,
        lastAt: 0,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setErrors({});
    setState((s) => {
      const next = s.future[0];
      if (next === undefined) return s;
      return {
        draft: applyStockSync(next, syncedLots.current),
        past: [...s.past, s.draft].slice(-HISTORY_LIMIT),
        future: s.future.slice(1),
        lastKey: null,
        lastAt: 0,
      };
    });
  }, []);

  /** Replace the draft wholesale and start a fresh history (used after a save). */
  const reset = useCallback((next: ProductDraft) => {
    setErrors({});
    setState({ draft: next, past: [], future: [], lastKey: null, lastAt: 0 });
  }, []);

  const validate = useCallback((): boolean => {
    const next = computeErrors(draft);
    setErrors(next);
    return !hasErrors(next);
  }, [draft]);

  const buildInput = useCallback((): ProductInput | null => {
    if (!validate()) return null;
    return buildProductInput(draft);
  }, [draft, validate]);

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
    syncStockValues,
    addProperty,
    removeProperty,
    updateProperty,
    addProductName,
    removeProductName,
    updateProductName,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    validate,
    buildInput,
    reset,
  } as const;
}

export type ProductFormController = ReturnType<typeof useProductForm>;
