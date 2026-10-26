import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { useQuery } from "./use-query";

/**
 * The records search box. An empty filter is the absence of the param — a URL
 * carrying `query=` is noise — but a non-empty one is stored exactly as typed,
 * since the box reads its own value back out of here.
 */
let search = "";
function Probe() {
  search = useLocation().search;
  return null;
}
function harness(entry = "/records") {
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
    expect(harness("/records?query=kopi%20susu").result.current[0]).toBe("kopi susu");
  });

  test("stores a query as typed", () => {
    const { result } = harness();

    act(() => result.current[1]("kopi susu"));

    expect(params().get("query")).toBe("kopi susu");
  });

  test("a blank box removes the param instead of writing an empty one", () => {
    const { result } = harness("/records?query=kopi");

    act(() => result.current[1]("   "));

    expect(params().has("query")).toBe(false);
  });

  test("other filters are kept", () => {
    const { result } = harness("/records?mode=outcoming");

    act(() => result.current[1]("kopi"));

    expect(params().get("mode")).toBe("outcoming");
  });
});
