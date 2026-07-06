import { useCallback } from "react";
import { useSearchParams } from "react-router";

/* ------------------------------------------------------------------ */
/*  Filter shape                                                       */
/* ------------------------------------------------------------------ */

export type ProductFilters = {
  /** Show only products where any capital entry has capital >= price. */
  losing: boolean;
  /** Show only products where any capital entry has stock <= 0.     */
  emptyStock: boolean;
  /** Minimum price (inclusive). `undefined` = no floor.             */
  priceMin: number | undefined;
  /** Maximum price (inclusive). `undefined` = no ceiling.           */
  priceMax: number | undefined;
  /** Show only products that have a non‑empty `note`.               */
  hasNote: boolean;
  /** Show products updated within this many days.                   */
  updatedWithin: number | undefined;
};

/* ------------------------------------------------------------------ */
/*  URL param <-> filter key mapping                                   */
/* ------------------------------------------------------------------ */

const KEY_MAP = {
  losing: "losing",
  emptyStock: "empty",
  priceMin: "price-min",
  priceMax: "price-max",
  hasNote: "has-note",
  updatedWithin: "updated",
};

/* ------------------------------------------------------------------ */
/*  Hook: read + write filters via URL search params                   */
/* ------------------------------------------------------------------ */

export function useFilters(): [ProductFilters, (patch: Partial<ProductFilters>) => void] {
  const [search, setSearch] = useSearchParams();

  const filters: ProductFilters = {
    losing: search.get(KEY_MAP.losing) === "1",
    emptyStock: search.get(KEY_MAP.emptyStock) === "1",
    priceMin: parseMaybe(search.get(KEY_MAP.priceMin)),
    priceMax: parseMaybe(search.get(KEY_MAP.priceMax)),
    hasNote: search.get(KEY_MAP.hasNote) === "1",
    updatedWithin: parseMaybe(search.get(KEY_MAP.updatedWithin)),
  };

  const setFilters = useCallback(
    (patch: Partial<ProductFilters>) => {
      setSearch((old) => {
        const s = new URLSearchParams(old);
        for (const filterKey of Object.keys(patch) as (keyof ProductFilters)[]) {
          const value = patch[filterKey];
          const param = KEY_MAP[filterKey];
          if (
            value === undefined ||
            value === false ||
            (typeof value === "number" && isNaN(value))
          ) {
            s.delete(param);
          } else if (typeof value === "boolean") {
            s.set(param, "1");
          } else {
            s.set(param, String(value));
          }
        }
        // Reset to page 1 whenever any filter changes.
        s.set("page", "1");
        return s;
      });
    },
    [setSearch],
  );

  return [filters, setFilters];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseMaybe(raw: string | null): number | undefined {
  if (raw === null) return undefined;
  const n = Number(raw);
  return isNaN(n) ? undefined : n;
}
