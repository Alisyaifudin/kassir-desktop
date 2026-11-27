import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { singleOpen, useOpenLines, useOpenProduct } from "./use-open";

/**
 * The accordion the Products table can have open, in the URL. It has to survive the
 * screen unmounting (the row's pencil opens the product's own page) and it must never
 * cost the period, which lives in the same query.
 */
let search = "";
function Probe() {
  search = useLocation().search;
  return null;
}
function harness(entry = "/analytics/products") {
  return renderHook(() => useOpenProduct(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[entry]}>
        <Probe />
        {children}
      </MemoryRouter>
    ),
  });
}
const params = () => new URLSearchParams(search);

describe("useOpenProduct", () => {
  test("reads the open product from the URL", () => {
    expect(harness("/analytics/products?open=p1").result.current[0]).toBe("p1");
  });

  test("nothing open is not a product", () => {
    expect(harness().result.current[0]).toBeNull();
  });

  test("opening one writes it and keeps the period", () => {
    const { result } = harness("/analytics/products?from=100&to=200");

    act(() => result.current[1]("p1"));

    expect(params().get("open")).toBe("p1");
    expect(params().get("from")).toBe("100");
    expect(params().get("to")).toBe("200");
  });

  test("a key the catalog no longer holds travels as it was written", () => {
    // A line whose product is gone is grouped under `name:<snapshot>` — colons and
    // spaces included, and it has to come back out of the URL exactly.
    const { result } = harness();

    act(() => result.current[1]("name:Kopi Susu 1kg"));

    expect(params().get("open")).toBe("name:Kopi Susu 1kg");
  });

  test("closing removes the param instead of writing an empty one", () => {
    const { result } = harness("/analytics/products?open=p1&from=100");

    act(() => result.current[1](null));

    expect(params().get("open")).toBeNull();
    expect(params().get("from")).toBe("100");
  });
});

/**
 * Tanstack hands back the whole expanded map, with the rows that were already open
 * still in it. The table shows one accordion, so the state it writes is whichever key
 * the toggle actually moved.
 */
describe("singleOpen", () => {
  test("opening a row with nothing open keeps that row", () => {
    expect(singleOpen({}, { p1: true })).toBe("p1");
  });

  test("opening a second row moves the accordion to it", () => {
    // `{ p1: true, p2: true }` is what tanstack returns — p1 must not win.
    expect(singleOpen({ p1: true }, { p1: true, p2: true })).toBe("p2");
  });

  test("closing the open row leaves nothing open", () => {
    expect(singleOpen({ p1: true }, { p1: false })).toBeNull();
  });

  test("a state that changed nothing keeps nothing", () => {
    expect(singleOpen({ p1: true }, { p1: true })).toBeNull();
  });

  test("expand-everything has no one-at-a-time answer", () => {
    expect(singleOpen({}, true)).toBeNull();
  });
});

/**
 * The accordion's page of lines, beside the product it belongs to. A line links to its
 * record, so the page has to survive that round trip the same way the open product does.
 */
describe("useOpenLines", () => {
  const lines = () =>
    renderHook(() => useOpenLines(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={["/analytics/products?open=p1"]}>
          <Probe />
          {children}
        </MemoryRouter>
      ),
    });

  test("no page in the URL is the first page", () => {
    expect(lines().result.current[0]).toBe(1);
  });

  test("a page the URL names is read back", () => {
    const { result } = renderHook(() => useOpenLines(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={["/analytics/products?open=p1&lines=3"]}>
          <Probe />
          {children}
        </MemoryRouter>
      ),
    });

    expect(result.current[0]).toBe(3);
  });

  test("a value that is not a page number reads as the first page", () => {
    for (const raw of ["0", "-2", "dua", "2.5", ""]) {
      const { result } = renderHook(() => useOpenLines(), {
        wrapper: ({ children }) => (
          <MemoryRouter initialEntries={[`/analytics/products?lines=${raw}`]}>
            <Probe />
            {children}
          </MemoryRouter>
        ),
      });

      expect(result.current[0]).toBe(1);
    }
  });

  test("another page keeps the open product and the period", () => {
    const { result } = lines();

    act(() => result.current[1](2));

    expect(params().get("lines")).toBe("2");
    expect(params().get("open")).toBe("p1");
  });

  test("the first page is written by absence", () => {
    const { result } = lines();

    act(() => result.current[1](2));
    act(() => result.current[1](1));

    expect(params().get("lines")).toBeNull();
  });

  test("opening another product starts it at its first page", () => {
    const { result } = renderHook(() => useOpenProduct(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={["/analytics/products?open=p1&lines=4"]}>
          <Probe />
          {children}
        </MemoryRouter>
      ),
    });

    act(() => result.current[1]("p2"));

    expect(params().get("open")).toBe("p2");
    expect(params().get("lines")).toBeNull();
  });
});
