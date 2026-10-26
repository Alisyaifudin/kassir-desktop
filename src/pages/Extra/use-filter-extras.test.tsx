import { describe, expect, test } from "bun:test";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { Extra } from "~/services/extra";
import { useFilterExtras } from "./use-filter-extras";

/**
 * The extras catalog narrowed by the URL's query. A blank query must hand back the
 * service's own order untouched (the catalog is arranged by the operator); a
 * typed one is ranked by the fuzzy ladder.
 */
const extra = (id: string, name: string, value: number): Extra => ({
  id,
  name,
  value,
  kind: "number",
  flag: 0,
  updatedAt: 1,
  syncAt: null,
});

const extras: Extra[] = [
  extra("e1", "Ongkos Kirim", 10_000),
  extra("e2", "Diskon Grosir", 2_000),
  extra("e3", "Plastik", 500),
];

function harness(entry = "/extras") {
  return renderHook(() => useFilterExtras(extras), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
    ),
  });
}

describe("useFilterExtras", () => {
  test("a blank query keeps the service order and its array", () => {
    expect(harness().result.current).toBe(extras);
    expect(harness("/extras?query=%20%20").result.current).toBe(extras);
  });

  test("a query narrows the list", () => {
    expect(harness("/extras?query=grosir").result.current.map((item) => item.id)).toEqual([
      "e2",
    ]);
  });

  test("a query that matches nothing is an empty list, not the whole catalog", () => {
    expect(harness("/extras?query=zzzz").result.current).toEqual([]);
  });
});
