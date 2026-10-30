import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { Effect } from "effect";
import { integer } from "~/lib/utils";
import { service } from "~/services";

export type ViewMode = "table" | "grid";
export type StockFilter = "all" | "in" | "low" | "out";
export type MarginFilter = "all" | "profit" | "loss";
export type PublishFilter = "all" | "published" | "unpublished";
export type SortBy = "score" | "name" | "price" | "capital" | "stock" | "updated";
type SortDir = "asc" | "desc";

const STOCK_FILTERS = ["all", "in", "low", "out"] as const;
const MARGIN_FILTERS = ["all", "profit", "loss"] as const;
const PUBLISH_FILTERS = ["all", "published", "unpublished"] as const;
const SORT_BY = ["score", "name", "price", "capital", "stock", "updated"] as const;
const SORT_DIRS = ["asc", "desc"] as const;
const VIEW_MODES = ["table", "grid"] as const;
export const PAGE_SIZES = [10, 20, 50, 100] as const;

/** Products at or below this base-pcs count count as "low stock". */
export const LOW_STOCK_THRESHOLD = 5;

export type ListState = {
  q: string;
  kinds: string[];
  stock: StockFilter;
  margin: MarginFilter;
  publish: PublishFilter;
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

/**
 * The view is the one piece of list state that is a preference rather than a
 * filter: it is mirrored to localStorage, so a bare `/products` reopens on the
 * layout last used instead of on cards. The URL still wins when it carries a
 * `view`, so a shared link opens the same way it did when it was copied.
 */
function storedView(): ViewMode {
  return Effect.runSync(
    service.config.productView.get().pipe(Effect.catchAll(() => Effect.succeed<ViewMode>("grid"))),
  );
}

export function useListState() {
  const [params, setParams] = useSearchParams();

  const state = useMemo<ListState>(() => {
    const sizeRaw = Number(params.get("size"));
    const q = params.get("q") ?? "";
    const sortRaw = params.get("sort");
    // No `sort` param means "auto": relevance while searching, name otherwise.
    // An explicit `sort=name` must survive a query (it is not the default any
    // more), so only `score` is treated as the auto case when written back.
    const explicitSort = sortRaw !== null && (SORT_BY as readonly string[]).includes(sortRaw);
    const chosen = oneOf(sortRaw, SORT_BY, "name");
    const sort =
      !explicitSort && q.trim() !== ""
        ? "score"
        : q.trim() === "" && chosen === "score"
          ? "name"
          : chosen;
    return {
      q,
      kinds: (params.get("kinds") ?? "").split(",").filter(Boolean),
      stock: oneOf(params.get("stock"), STOCK_FILTERS, "all"),
      margin: oneOf(params.get("margin"), MARGIN_FILTERS, "all"),
      publish: oneOf(params.get("publish"), PUBLISH_FILTERS, "all"),
      sort,
      dir: oneOf(params.get("dir"), SORT_DIRS, "asc"),
      view: oneOf(params.get("view"), VIEW_MODES, storedView()),
      page: Math.max(1, integer.catch(1).parse(params.get("page"))),
      size: (PAGE_SIZES as readonly number[]).includes(sizeRaw) ? sizeRaw : 20,
    };
  }, [params]);

  const set = useCallback(
    (patch: ListStatePatch) => {
      // Mirror the view for the next visit, outside the URL updater (which must
      // stay pure — StrictMode runs it twice). Fire-and-forget: the URL already
      // carries the view, so a full or disabled localStorage must not turn a
      // toggle into an error dialog.
      if (patch.view !== undefined) {
        void Effect.runFork(Effect.ignore(service.config.productView.set(patch.view)));
      }

      setParams(
        (old) => {
          const s = new URLSearchParams(old);
          const put = (key: string, value: string | null) => {
            if (value === null || value === "") s.delete(key);
            else s.set(key, value);
          };

          let resetPage = false;
          if (patch.q !== undefined) {
            // Stored exactly as typed. The search bar is the one writer and reads
            // its own value back from here, so a trimmed `q` would come back to
            // the field and eat the space of "kopi susu" as it was typed. Readers
            // trim (`filterProducts`); the field is the only place spaces matter.
            put("q", patch.q);
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
          if (patch.publish !== undefined) {
            put("publish", patch.publish === "all" ? null : patch.publish);
            resetPage = true;
          }
          if (patch.sort !== undefined) {
            // `score` is the auto default while searching, so writing it back
            // removes the param; every other choice must be stored explicitly.
            put("sort", patch.sort === "score" ? null : patch.sort);
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
          if (patch.view !== undefined) {
            // Never elided, unlike every other param here. Their defaults are
            // constants evaluated in the same render, so dropping the param is
            // lossless; `view`'s absent-param fallback is `storedView()`, a
            // separate store whose mirror write above lands a tick later than
            // this synchronous navigate. Dropping `view=grid` would therefore
            // read back the old value and the toggle would look dead.
            put("view", patch.view);
          }

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
