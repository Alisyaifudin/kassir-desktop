import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { Product } from "~/services/product";
import { PRODUCT_FLAG_UNPUBLISHED } from "~/services/product";
import { ProductTable } from "./z-ProductTable";

/**
 * The table's `Modal` column shows the same number the card does.
 *
 * It used to print `product.capital` — the weighted average of the lots — while
 * the card printed `maxCapital`, the dearest lot. One page, one word, two numbers:
 * switching between grid and table made the shop's own cost price look like it
 * had changed. The sort follows the column too (see `use-filtered.test.ts`).
 */
function product(options: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Kopi Susu",
    note: "",
    flag: 0,
    altNames: [],
    listings: [
      {
        id: "l1",
        productId: "p1",
        name: "Kopi Susu",
        price: 10_000,
        unit: 1,
        kind: "retail",
        code: "899123",
        updatedAt: 0,
        syncAt: null,
      },
    ],
    stock: 12,
    capital: 567,
    maxCapital: 900,
    cover: null,
    updatedAt: 0,
    syncAt: null,
    ...options,
  };
}

function renderTable(items: Product[]) {
  render(
    <MemoryRouter initialEntries={["/products"]}>
      <ProductTable items={items} start={0} urlBack="/products" />
    </MemoryRouter>,
  );
}

describe("product table, Modal column", () => {
  test("shows the highest lot capital, not the average", () => {
    renderTable([product()]);

    expect(screen.getByText("900")).toBeDefined();
    expect(screen.queryByText("567")).toBeNull();
  });

  test("a withdrawn product still shows it", () => {
    renderTable([product({ flag: PRODUCT_FLAG_UNPUBLISHED, maxCapital: 1_250 })]);

    expect(screen.getByText("1.250")).toBeDefined();
  });
});
