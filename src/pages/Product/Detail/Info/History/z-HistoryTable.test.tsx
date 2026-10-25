/**
 * The history row's second line is the only place the screen says what a
 * movement was worth, and it has to say the right thing for each direction:
 * stock coming in is a purchase (its lot's `Modal`), stock going out is a sale
 * (the `Harga` it went for), and a manual correction is neither — it has no
 * record line, so it has no price, and naming one would be inventing it.
 *
 * Run with:  bun test src/pages/Product/Detail/Info/History/z-HistoryTable.test.tsx
 */
import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { ProductEvent } from "~/services/product";
import { HistoryTable } from "./z-HistoryTable";

function event(overrides: Partial<ProductEvent> = {}): ProductEvent {
  return {
    id: "e1",
    createdAt: 1_700_000_000_000,
    value: 1,
    capital: 500,
    note: "",
    productId: "p1",
    stockId: "s1",
    recordId: null,
    price: null,
    ...overrides,
  };
}

function renderTable(events: ProductEvent[]) {
  return render(
    <MemoryRouter initialEntries={["/products/p1"]}>
      <HistoryTable events={events} />
    </MemoryRouter>,
  );
}

describe("the history row's detail line", () => {
  test("stock coming in names the lot's cost — it is a purchase", () => {
    renderTable([event({ value: 5 })]);

    expect(screen.getByText("Modal 500")).toBeDefined();
  });

  test("stock going out names what it was sold for, not what it cost", () => {
    renderTable([event({ value: -5, recordId: "r1", price: 1_500 })]);

    expect(screen.getByText("Harga 1.500")).toBeDefined();
    expect(screen.queryByText(/Modal/)).toBeNull();
  });

  test("the note still follows the price", () => {
    renderTable([event({ value: -5, recordId: "r1", price: 1_500, note: "Promo" })]);

    expect(screen.getByText("Harga 1.500 · Promo")).toBeDefined();
  });

  test("a manual stock-out names neither Modal nor Harga, only its note", () => {
    renderTable([event({ value: -5, note: "Rusak" })]);

    expect(screen.queryByText(/Modal/)).toBeNull();
    expect(screen.queryByText(/Harga/)).toBeNull();
    expect(screen.getByText("Rusak")).toBeDefined();
  });

  test("with nothing to say, the row draws no second line at all", () => {
    renderTable([event({ value: -5 })]);

    // The date and the amount, and no empty line between them.
    const row = screen.getByRole("listitem");
    expect(row.querySelectorAll("span")).toHaveLength(2);
  });
});
