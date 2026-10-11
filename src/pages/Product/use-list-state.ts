import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { integer } from "~/lib/utils";

export type ViewMode = "table" | "grid";
export type StockFilter = "all" | "in" | "low" | "out";
export type MarginFilter = "all" | "profit" | "loss";
export type SortBy = "name" | "price" | "capital" | "stock" | "updated";
export type SortDir = "asc" | "desc";

export const STOCK_FILTERS = ["all", "in", "low", "out"] as const;
export const MARGIN_FILTERS = ["all", "profit", "loss"] as const;
export const SORT_BY = ["name", "price", "capital", "stock", "updated"] as const;
export const SORT_DIRS = ["asc", "desc"] as const;
export const VIEW_MODES = ["table", "grid"] as const;
export const PAGE_SIZES = [10, 20, 50, 100] as const;

/** Products at or below this base-pcs count count as "low stock". */
export const LOW_STOCK_THRESHOLD = 5;

export type ListState = {
  q: string;
  kinds: string[];
  stock: StockFilter;
  margin: MarginFilter;
  sort: SortBy;
  dir: SortDir;
  view: ViewMode;
  page: number;
  size: number;
};

export type ListStatePatch = Partial<ListState>;

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function useListState() {
  const [params, setParams] = useSearchParams();

  const state = useMemo<ListState>(() => {
    const sizeRaw = Number(params.get("size"));
    return {
      q: params.get("q") ?? "",
      kinds: (params.get("kinds") ?? "").split(",").filter(Boolean),
      stock: oneOf(params.get("stock"), STOCK_FILTERS, "all"),
      margin: oneOf(params.get("margin"), MARGIN_FILTERS, "all"),
      sort: oneOf(params.get("sort"), SORT_BY, "name"),
      dir: oneOf(params.get("dir"), SORT_DIRS, "asc"),
      view: oneOf(params.get("view"), VIEW_MODES, "grid"),
      page: Math.max(1, integer.catch(1).parse(params.get("page"))),
      size: (PAGE_SIZES as readonly number[]).includes(sizeRaw) ? sizeRaw : 20,
    };
  }, [params]);

  const set = useCallback(
    (patch: ListStatePatch) => {
      setParams(
        (old) => {
          const s = new URLSearchParams(old);
          const put = (key: string, value: string | null) => {
            if (value === null || value === "") s.delete(key);
            else s.set(key, value);
          };

          let resetPage = false;
          if (patch.q !== undefined) {
            put("q", patch.q.trim());
            resetPage = true;
          }
          if (patch.kinds !== undefined) {
            put("kinds", patch.kinds.join(","));
            resetPage = true;
          }
          if (patch.stock !== undefined) {
            put("stock", patch.stock === "all" ? null : patch.stock);
            resetPage = true;
          }
          if (patch.margin !== undefined) {
            put("margin", patch.margin === "all" ? null : patch.margin);
            resetPage = true;
          }
          if (patch.sort !== undefined) {
            put("sort", patch.sort === "name" ? null : patch.sort);
            resetPage = true;
          }
          if (patch.dir !== undefined) {
            put("dir", patch.dir === "asc" ? null : patch.dir);
            resetPage = true;
          }
          if (patch.size !== undefined) {
            put("size", patch.size === 20 ? null : String(patch.size));
            resetPage = true;
          }
          if (patch.view !== undefined) put("view", patch.view === "grid" ? null : patch.view);

          if (patch.page !== undefined) {
            put("page", patch.page <= 1 ? null : String(patch.page));
          } else if (resetPage) {
            put("page", null);
          }

          return s;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { state, set } as const;
}
