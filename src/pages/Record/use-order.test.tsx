import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { useOrder } from "./use-order";

/**
 * The list's sort column, in the URL. Newest first is the default because the day
 * list is read from the bottom of the day; an unknown column or direction must
 * fall back rather than leave the table unsorted.
 */
let search = "";
function Probe() {
  search = useLocation().search;
  return null;
}
function harness(entry = "/records") {
  return renderHook(() => useOrder(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[entry]}>
        <Probe />
        {children}
      </MemoryRouter>
    ),
  });
}
const params = () => new URLSearchParams(search);

describe("useOrder", () => {
  test("defaults to newest first", () => {
    expect(harness().result.current[0]).toEqual({ order: "time", sort: "desc" });
  });

  test("reads both halves from the URL", () => {
    expect(harness("/records?order=total&sort=asc").result.current[0]).toEqual({
      order: "total",
      sort: "asc",
    });
  });

  test("a half that does not parse resets both, so the table stays coherent", () => {
    expect(harness("/records?order=nope&sort=asc").result.current[0]).toEqual({
      order: "time",
      sort: "desc",
    });
    expect(harness("/records?order=total&sort=nope").result.current[0]).toEqual({
      order: "time",
      sort: "desc",
    });
  });

  test("clicking a header writes both and keeps the filters", () => {
    const { result } = harness("/records?query=kopi");

    act(() => result.current[1]("total", "asc"));

    expect(params().get("order")).toBe("total");
    expect(params().get("sort")).toBe("asc");
    expect(params().get("query")).toBe("kopi");
  });
});
