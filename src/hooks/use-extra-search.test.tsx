import { describe, expect, test } from "bun:test";
import { renderHook } from "@testing-library/react";
import { useExtraSearch } from "./use-extra-search";

/**
 * The extra catalog's search is fuzzy on `name`, and the hook exists to keep the
 * built index with the list: rebuilding it per keystroke is what makes a search
 * field feel slow on a long catalog. Both halves are pinned here — the ranking,
 * and the memo that survives a re-render when the list has not changed.
 */
type Row = { id: string; name: string };

const rows: Row[] = [
  { id: "e1", name: "Ongkos Kirim" },
  { id: "e2", name: "Diskon Grosir" },
  { id: "e3", name: "Plastik" },
];

describe("useExtraSearch", () => {
  test("finds a row by a fragment of its name", () => {
    const { result } = renderHook(() => useExtraSearch(rows));

    const hits = result.current("grosir");

    expect(hits.map((hit) => hit.item.name)).toEqual(["Diskon Grosir"]);
  });

  test("ranks the better match first", () => {
    const { result } = renderHook(() => useExtraSearch(rows));

    const hits = result.current("ongkir");

    expect(hits[0].item.name).toBe("Ongkos Kirim");
  });

  test("a query that matches nothing returns no rows", () => {
    const { result } = renderHook(() => useExtraSearch(rows));
    expect(result.current("zzzz")).toEqual([]);
  });

  test("the search function is stable while the list is", () => {
    const { result, rerender } = renderHook(({ items }) => useExtraSearch(items), {
      initialProps: { items: rows },
    });
    const first = result.current;

    rerender({ items: rows });

    expect(result.current).toBe(first);
  });

  test("a new list builds a new search, so an added row is found", () => {
    const { result, rerender } = renderHook(({ items }) => useExtraSearch(items), {
      initialProps: { items: rows },
    });
    rerender({ items: [...rows, { id: "e4", name: "Zakat" }] });

    expect(result.current("zakat").map((hit) => hit.item.id)).toEqual(["e4"]);
  });
});
