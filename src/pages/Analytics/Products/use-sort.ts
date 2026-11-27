import { useMemo } from "react";
import { useSearchParams } from "~/services/route/react";
import type { SortingState, Updater } from "@tanstack/react-table";

/** The columns the table can be ordered by — the money and count ones, plus the name. */
export const SORT_BY = ["name", "qty", "revenue", "margin", "lines"] as const;

export type SortBy = (typeof SORT_BY)[number];
export type SortDir = "asc" | "desc";

/** What the table opens on: the biggest earner first. */
export const DEFAULT_SORT: SortBy = "revenue";
export const DEFAULT_DIR: SortDir = "desc";

const SORT_KEY = "sort";
const DIR_KEY = "dir";

/**
 * The sort column and direction, kept in the URL.
 *
 * They are a filter as much as the period is: reading the products screen, opening a
 * product from a row and stepping back has to return to the same ordering, and a link
 * handed to somebody else has to open the same way it was read on this machine.
 *
 * The default is written by **absence** (`sort` and `dir` both missing), like every
 * other default in this app's URLs — the URL is only allowed to say what was chosen.
 * The write **replaces** the history entry: ordering a table is a detail inside the
 * screen, not a place to go Back to.
 */
export function useSort(): [SortingState, (updater: Updater<SortingState>) => void] {
  const [search, setSearch] = useSearchParams();
  const column = oneOf(search.get(SORT_KEY), SORT_BY) ?? DEFAULT_SORT;
  const dir = oneOf(search.get(DIR_KEY), ["asc", "desc"] as const) ?? DEFAULT_DIR;
  const desc = dir === "desc";
  const sorting = useMemo<SortingState>(() => [{ id: column, desc }], [column, desc]);

  function setSorting(updater: Updater<SortingState>) {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    // A table is always ordered by something: tanstack's third click ("no sort")
    // leaves an empty state, which reads as the default rather than as no order at
    // all — an unsorted 200-row list is not a thing anybody asked for.
    const picked = next[0];
    const sort = (picked === undefined ? null : oneOf(picked.id, SORT_BY)) ?? DEFAULT_SORT;
    const dir: SortDir = picked === undefined ? DEFAULT_DIR : picked.desc ? "desc" : "asc";

    setSearch(
      (old) => {
        const params = new URLSearchParams(old);
        if (sort === DEFAULT_SORT) params.delete(SORT_KEY);
        else params.set(SORT_KEY, sort);
        if (dir === DEFAULT_DIR) params.delete(DIR_KEY);
        else params.set(DIR_KEY, dir);
        return params;
      },
      { replace: true },
    );
  }

  return [sorting, setSorting];
}

/** The value if it is one of `allowed`, else null — an unknown key is not a choice. */
function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}
