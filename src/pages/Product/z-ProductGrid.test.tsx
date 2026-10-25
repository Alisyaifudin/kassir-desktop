import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { Product } from "~/services/product";
import { PRODUCT_FLAG_UNPUBLISHED } from "~/services/product";
import { ProductGrid } from "./z-ProductGrid";

/**
 * The card carries the product's `Modal`.
 *
 * It is the *highest* lot's per-pcs capital, not the weighted average the table
 * column shows: the dearest lot is what decides whether a price is worth selling
 * at. The projection computes it (`maxCapital` in the product service); the card
 * only prints it, so this pins the label, the place under the price, and that a
 * card without lots still prints a number rather than a gap.
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

function renderGrid(items: Product[]) {
  render(
    <MemoryRouter initialEntries={["/products"]}>
      <ProductGrid items={items} urlBack="/products" />
    </MemoryRouter>,
  );
}

describe("product card, Modal", () => {
  test("prints the highest lot's capital, formatted, under the price", () => {
    renderGrid([product()]);

    const modal = screen.getByText("Modal 900");
    expect(modal).toBeDefined();
    // It sits between the price range and the stock row.
    const body = modal.parentElement as HTMLElement;
    const lines = [...body.children].map((child) => child.textContent);
    expect(lines.slice(0, 3)).toEqual(["Kopi Susu", "899123", "Rp10.000"]);
    expect(lines[3]).toBe("Modal 900");
  });

  test("shows the number, not the weighted average", () => {
    // 567 is `capital` (the table's column); 900 is the dearest lot.
    renderGrid([product({ capital: 567, maxCapital: 900 })]);

    expect(screen.getByText("Modal 900")).toBeDefined();
    expect(screen.queryByText("Modal 567")).toBeNull();
  });

  test("a withdrawn product still carries it", () => {
    renderGrid([product({ flag: PRODUCT_FLAG_UNPUBLISHED, maxCapital: 1_250 })]);

    expect(screen.getByText("Modal 1.250")).toBeDefined();
  });

  test("no lots means zero, not a blank", () => {
    renderGrid([product({ stock: 0, capital: 0, maxCapital: 0 })]);

    expect(screen.getByText("Modal 0")).toBeDefined();
  });
});
