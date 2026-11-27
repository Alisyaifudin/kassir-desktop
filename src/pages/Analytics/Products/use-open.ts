import { useSearchParams } from "~/services/route/react";
import type { ExpandedState } from "@tanstack/react-table";

/** The one accordion this table can have open. */
export const OPEN_KEY = "open";

/** Which page of that product's lines is showing. */
export const LINES_KEY = "lines";

/**
 * The single product to keep open after tanstack toggled a row.
 *
 * It has to be the key that **changed**, not the first key that is true: the state
tanstack hands back still carries the ones that were open, so opening a second row
 * is `{ A: true, B: true }` — reading the first true key would refuse to move the
 * accordion off the row the operator just closed by opening another.
 */
export function singleOpen(expanded: ExpandedState, next: ExpandedState): string | null {
  // "Expand everything" has no one-at-a-time answer, and no control here asks for it.
  if (next === true) return null;
  const before: Record<string, boolean> = expanded === true ? {} : expanded;
  const changed = Object.keys(next).find(
    (key) => (next[key] === true) !== (before[key] === true),
  );
  return changed !== undefined && next[changed] === true ? changed : null;
}

/**
 * Which product's record lines are open under the table, kept in the URL.
 *
 * One at a time, and deliberately where the history can see it: the rows behind an
 * accordion are read for one product, and opening that product's own page from the
 * row's pencil and stepping back has to find them still open. A `useState` there
 * would be gone the moment the screen unmounted.
 *
 * The write **replaces** the history entry: opening and closing rows is a detail
 * inside this screen, not a place to go Back to — otherwise Back would walk the
 * accordions the operator glanced at instead of leaving the page. Every other param
 * (the period) is carried over untouched.
 */
export function useOpenProduct() {
  const [search, setSearch] = useSearchParams();
  const open = search.get(OPEN_KEY);
  function setOpen(key: string | null) {
    setSearch(
      (old) => {
        const next = new URLSearchParams(old);
        if (key === null) next.delete(OPEN_KEY);
        else next.set(OPEN_KEY, key);
        // A page of lines belongs to the product that was open: the next one starts
        // at its first page.
        next.delete(LINES_KEY);
        return next;
      },
      { replace: true },
    );
  }
  return [open, setOpen] as const;
}

/**
 * Which page of the open product's lines is showing, in the URL beside it.
 *
 * A line links to its record, and stepping back has to find the same page — the same
 * reason the open product itself is not component state. Anything that is not a page
 * number reads as the first page, and the first page is written by *absence*, like
 * every other default in this app's URLs.
 */
export function useOpenLines() {
  const [search, setSearch] = useSearchParams();
  const raw = Number(search.get(LINES_KEY));
  const page = Number.isInteger(raw) && raw >= 1 ? raw : 1;
  function setPage(next: number) {
    setSearch(
      (old) => {
        const params = new URLSearchParams(old);
        if (next <= 1) params.delete(LINES_KEY);
        else params.set(LINES_KEY, String(Math.trunc(next)));
        return params;
      },
      { replace: true },
    );
  }
  return [page, setPage] as const;
}
