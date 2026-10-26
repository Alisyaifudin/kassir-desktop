import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { useSort } from "./use-sort";

/**
 * The debt table's sort, in the URL so a link reopens the same ordering. `desc` by
 * payment date is the useful default: the oldest debt is the one to chase.
 */
let search = "";
function Probe() {
  search = useLocation().search;
  return null;
}
function harness(entry = "/debt") {
  return renderHook(() => useSort(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[entry]}>
        <Probe />
        {children}
      </MemoryRouter>
    ),
  });
}
const params = () => new URLSearchParams(search);

describe("useSort", () => {
  test("defaults to payment date, descending", () => {
    expect(harness().result.current[0]).toEqual({ sortBy: "paidAt", sortDir: "desc" });
  });

  test("reads both halves from the URL", () => {
    expect(harness("/debt?sort-by=total&sort-dir=asc").result.current[0]).toEqual({
      sortBy: "total",
      sortDir: "asc",
    });
  });

  test("an unknown half falls back on its own", () => {
    expect(harness("/debt?sort-by=nope&sort-dir=asc").result.current[0]).toEqual({
      sortBy: "paidAt",
      sortDir: "asc",
    });
    expect(harness("/debt?sort-by=total&sort-dir=nope").result.current[0]).toEqual({
      sortBy: "total",
      sortDir: "desc",
    });
  });

  test("a new sort writes both params and keeps the rest", () => {
    const { result } = harness("/debt?query=budi");

    act(() => result.current[1]("total", "asc"));

    expect(params().get("sort-by")).toBe("total");
    expect(params().get("sort-dir")).toBe("asc");
    expect(params().get("query")).toBe("budi");
  });
});
