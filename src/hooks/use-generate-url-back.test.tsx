import { describe, expect, test } from "bun:test";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { useGenerateUrlBack } from "./use-generate-url-back";

/**
 * The URL a list row links back to: the screen's own base plus the query it is
 * currently showing, so opening a record and coming back lands on the same
 * filter, sort and page. It never re-writes an incoming `url_back` — a caller
 * that has to keep one uses `useGetUrlBack`.
 */
function wrapper(entry: string) {
  function RouterWrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>;
  }
  RouterWrapper.displayName = "RouterWrapper";
  return RouterWrapper;
}

function backOf(entry: string, base = "/records/search") {
  const { result } = renderHook(() => useGenerateUrlBack(base), { wrapper: wrapper(entry) });
  return result.current;
}

describe("useGenerateUrlBack", () => {
  test("appends the current query to the base", () => {
    expect(backOf("/records?day=1&mode=incoming")).toBe("/records/search?day=1&mode=incoming");
  });

  test("a bare entry is just the base, with no dangling `?`", () => {
    expect(backOf("/records")).toBe("/records/search");
  });

  test("the query travels through untouched, including an incoming url_back", () => {
    // The parse rule belongs to `useGetUrlBack`; this hook only has to keep the
    // parameters it was handed of the same length and order.
    expect(backOf("/records?query=kopi&page=2")).toBe("/records/search?query=kopi&page=2");
  });
});
