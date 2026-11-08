import { useCallback, useMemo } from "react";
import { useSearchParams } from "~/services/route/react";
import { integer } from "~/lib/utils";

export type ViewMode = "grid" | "table";
export type StatusFilter = "all" | "active" | "inactive";
export type ContentsFilter = "all" | "listings" | "extras";
export type SortBy = "name" | "updated" | "listings" | "extras";
export type SortDir = "asc" | "desc";

export type ListState = {
  q: string;
  status: StatusFilter;
  contents: ContentsFilter;
  sort: SortBy;
  dir: SortDir;
  view: ViewMode;
  page: number;
  size: number;
};

export type ListStatePatch = Partial<ListState>;
export const PAGE_SIZES = [10, 20, 50, 100] as const;

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

const STATUSES = ["all", "active", "inactive"] as const;
const CONTENTS = ["all", "listings", "extras"] as const;
const SORTS = ["name", "updated", "listings", "extras"] as const;
const DIRECTIONS = ["asc", "desc"] as const;
const VIEWS = ["grid", "table"] as const;

export function useListState() {
  const [params, setParams] = useSearchParams();

  const state = useMemo<ListState>(() => {
    const size = Number(params.get("size"));
    return {
      q: params.get("q") ?? "",
      status: oneOf(params.get("status"), STATUSES, "all"),
      contents: oneOf(params.get("contents"), CONTENTS, "all"),
      sort: oneOf(params.get("sort"), SORTS, "name"),
      dir: oneOf(params.get("dir"), DIRECTIONS, "asc"),
      view: oneOf(params.get("view"), VIEWS, "grid"),
      page: Math.max(1, integer.catch(1).parse(params.get("page"))),
      size: (PAGE_SIZES as readonly number[]).includes(size) ? size : 20,
    };
  }, [params]);

  const set = useCallback(
    (patch: ListStatePatch) => {
      setParams(
        (old) => {
          const next = new URLSearchParams(old);
          let resetPage = false;
          const put = (key: string, value: string | null) => {
            if (value === null || value === "") next.delete(key);
            else next.set(key, value);
          };

          if (patch.q !== undefined) {
            put("q", patch.q);
            resetPage = true;
          }
          if (patch.status !== undefined) {
            put("status", patch.status === "all" ? null : patch.status);
            resetPage = true;
          }
          if (patch.contents !== undefined) {
            put("contents", patch.contents === "all" ? null : patch.contents);
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
          if (patch.view !== undefined) put("view", patch.view === "grid" ? null : patch.view);
          if (patch.size !== undefined) {
            put("size", patch.size === 20 ? null : String(patch.size));
            resetPage = true;
          }
          if (patch.page !== undefined) put("page", patch.page <= 1 ? null : String(patch.page));
          else if (resetPage) put("page", null);

          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { state, set } as const;
}
