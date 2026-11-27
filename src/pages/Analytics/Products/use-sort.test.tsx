import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { useSort } from "./use-sort";

/**
 * The table's ordering, in the URL. It is a filter, not a preference: a row opens a
 * product and stepping back has to return to the same order — and the default is
 * written by absence, so a URL that says `sort=revenue&dir=desc` is noise.
 */
let search = "";
function Probe() {
  search = useLocation().search;
  return null;
}
function harness(entry = "/analytics/products") {
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
  test("opens on the biggest earner", () => {
    expect(harness().result.current[0]).toEqual([{ id: "revenue", desc: true }]);
  });

  test("reads the column and direction from the URL", () => {
    expect(harness("/analytics/products?sort=margin&dir=asc").result.current[0]).toEqual([
      { id: "margin", desc: false },
    ]);
  });

  test("a column or direction that is not one of them falls back", () => {
    // An unknown column would leave the table ordered by a header that does not exist.
    expect(harness("/analytics/products?sort=harga&dir=naik").result.current[0]).toEqual([
      { id: "revenue", desc: true },
    ]);
    expect(harness("/analytics/products?sort=margin").result.current[0]).toEqual([
      { id: "margin", desc: true },
    ]);
  });

  test("choosing a column writes it beside the period and the open product", () => {
    const { result } = harness("/analytics/products?from=100&to=200&open=p1");

    act(() => result.current[1]([{ id: "margin", desc: false }]));

    expect(params().get("sort")).toBe("margin");
    expect(params().get("dir")).toBe("asc");
    expect(params().get("from")).toBe("100");
    expect(params().get("open")).toBe("p1");
  });

  test("the default order is written by absence", () => {
    const { result } = harness("/analytics/products?sort=margin&dir=asc");

    act(() => result.current[1]([{ id: "revenue", desc: true }]));

    expect(params().get("sort")).toBeNull();
    expect(params().get("dir")).toBeNull();
  });

  test("an emptied order reads as the default, not as no order", () => {
    // tanstack's third click on a header leaves `[]`.
    const { result } = harness("/analytics/products?sort=margin");

    act(() => result.current[1]([]));

    expect(params().get("sort")).toBeNull();
    expect(result.current[0]).toEqual([{ id: "revenue", desc: true }]);
  });
});
