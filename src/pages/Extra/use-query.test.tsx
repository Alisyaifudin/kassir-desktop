import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { useQuery } from "./use-query";

/**
 * The extras search box, in the URL. A blank box removes the param; a typed one
 * is stored as typed, because the box reads its own value back from here.
 */
let search = "";
function Probe() {
  search = useLocation().search;
  return null;
}
function harness(entry = "/extras") {
  return renderHook(() => useQuery(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[entry]}>
        <Probe />
        {children}
      </MemoryRouter>
    ),
  });
}
const params = () => new URLSearchParams(search);

describe("useQuery", () => {
  test("no param is an empty query", () => {
    expect(harness().result.current[0]).toBe("");
  });

  test("reads the query from the URL", () => {
    expect(harness("/extras?query=ongkos").result.current[0]).toBe("ongkos");
  });

  test("stores a query as typed and keeps the rest", () => {
    const { result } = harness("/extras?tab=detail");

    act(() => result.current[1]("ongkos kirim"));

    expect(params().get("query")).toBe("ongkos kirim");
    expect(params().get("tab")).toBe("detail");
  });

  test("a blank box removes the param", () => {
    const { result } = harness("/extras?query=ongkos");

    act(() => result.current[1]("  "));

    expect(params().has("query")).toBe(false);
  });
});
