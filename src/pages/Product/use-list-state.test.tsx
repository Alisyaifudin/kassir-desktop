import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { useListState } from "./use-list-state";

/**
 * The product list's entire view state lives in the URL, so a refresh or a shared
 * link reopens the same filter, sort and page. Two rules are easy to break and
 * expensive when broken: defaults are *absent* params (a URL carrying
 * `sort=name&dir=asc&view=grid` is noise), and any change to a filter resets the
 * page — otherwise you land on page 4 of a three-row result.
 */
let search = "";

function Probe() {
  search = useLocation().search;
  return null;
}

function harness(entry = "/products") {
  return renderHook(() => useListState(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[entry]}>
        <Probe />
        {children}
      </MemoryRouter>
    ),
  });
}

const params = () => new URLSearchParams(search);

describe("useListState defaults", () => {
  test("a bare URL means the auto view: name, ascending, grid, page 1, 20 rows", () => {
    const { result } = harness();

    expect(result.current.state).toEqual({
      q: "",
      kinds: [],
      stock: "all",
      margin: "all",
      sort: "name",
      dir: "asc",
      view: "grid",
      page: 1,
      size: 20,
    });
  });

  test("every filter is read back from the URL", () => {
    const { result } = harness(
      "/products?q=kopi&kinds=retail,grosir&stock=low&margin=profit&sort=price&dir=desc&view=table&page=3&size=50",
    );

    expect(result.current.state).toEqual({
      q: "kopi",
      kinds: ["retail", "grosir"],
      stock: "low",
      margin: "profit",
      sort: "price",
      dir: "desc",
      view: "table",
      page: 3,
      size: 50,
    });
  });

  test("a value that is not in the allowed set falls back instead of reaching the query", () => {
    const { result } = harness(
      "/products?stock=nope&margin=nope&sort=nope&dir=nope&view=nope&page=abc&size=999",
    );

    expect(result.current.state).toMatchObject({
      stock: "all",
      margin: "all",
      sort: "name",
      dir: "asc",
      view: "grid",
      page: 1,
      size: 20,
    });
  });
});

describe("the auto sort", () => {
  test("typing a query switches to relevance", () => {
    expect(harness("/products?q=kopi").result.current.state.sort).toBe("score");
  });

  test("an explicit sort survives a query", () => {
    expect(harness("/products?q=kopi&sort=name").result.current.state.sort).toBe("name");
  });

  test("an empty query with sort=score reads as name, since relevance has nothing to rank", () => {
    expect(harness("/products?sort=score").result.current.state.sort).toBe("name");
  });
});

describe("writing the URL", () => {
  test("a search is stored as typed and resets the page", () => {
    const { result } = harness("/products?page=4&q=old");

    act(() => result.current.set({ q: "kopi susu" }));

    expect(params().get("q")).toBe("kopi susu");
    expect(params().has("page")).toBe(false);
  });

  test("defaults are removed rather than written", () => {
    const { result } = harness("/products?stock=low&margin=loss&sort=price&dir=desc&view=table&size=50");

    act(() =>
      result.current.set({
        stock: "all",
        margin: "all",
        sort: "score",
        dir: "asc",
        view: "grid",
        size: 20,
      }),
    );

    for (const key of ["stock", "margin", "sort", "dir", "view", "size"]) {
      expect(params().has(key)).toBe(false);
    }
  });

  test("a non-default choice is written", () => {
    const { result } = harness();

    act(() =>
      result.current.set({
        kinds: ["retail"],
        stock: "out",
        margin: "loss",
        sort: "price",
        dir: "desc",
        view: "table",
        size: 100,
        page: 2,
      }),
    );

    expect(params().get("kinds")).toBe("retail");
    expect(params().get("stock")).toBe("out");
    expect(params().get("margin")).toBe("loss");
    expect(params().get("sort")).toBe("price");
    expect(params().get("dir")).toBe("desc");
    expect(params().get("view")).toBe("table");
    expect(params().get("size")).toBe("100");
    expect(params().get("page")).toBe("2");
  });

  test("page 1 is the absence of a page param", () => {
    const { result } = harness("/products?page=5");

    act(() => result.current.set({ page: 1 }));

    expect(params().has("page")).toBe(false);
  });

  test("a view change alone does not reset the page", () => {
    const { result } = harness("/products?page=3");

    act(() => result.current.set({ view: "table" }));

    expect(params().get("page")).toBe("3");
  });
});
