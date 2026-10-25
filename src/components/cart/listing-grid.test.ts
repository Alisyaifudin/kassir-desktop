/**
 * Pins the cart grid's keyboard geometry.
 *
 * The grid is a `(row, column)` selection, and the arrow keys are only correct
 * because of the rules in this file: a wide cell owns every column it spans, the
 * remembered column survives a move, and the header's cells depend on which cart
 * screen the grid is drawing. That is the surface with the most audit findings in
 * the repo and the one that used to exist twice, so it gets a test rather than a
 * review habit.
 *
 * Run with:  bun test src/components/cart/listing-grid.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  PURCHASE_LISTING_LAYOUT,
  SALE_LISTING_LAYOUT,
  cellAt,
  cellsForRow,
  columnIn,
  rowsFor,
  sameRow,
  selectableCells,
  startOf,
  type RowRef,
} from "./listing-grid";

const HEADER: RowRef = { kind: "header" };
const TOP = (cardId: string): RowRef => ({ kind: "card", cardId, part: "top" });
const BOTTOM = (cardId: string): RowRef => ({ kind: "card", cardId, part: "bottom" });

describe("listing grid geometry", () => {
  test("a sale's header ends in the stage toggle, a purchase's does not", () => {
    const sale = cellsForRow(HEADER, SALE_LISTING_LAYOUT).map((cell) => cell.field);
    const purchase = cellsForRow(HEADER, PURCHASE_LISTING_LAYOUT).map((cell) => cell.field);

    expect(sale).toEqual(["search", "manual", "toggle"]);
    expect(purchase).toEqual(["search", "manual"]);
  });

  test("`+manual` sits where the layout says, so Tab past `Nama` lands on it", () => {
    const saleManual = cellAt(HEADER, 8, SALE_LISTING_LAYOUT);
    const purchaseManual = cellAt(HEADER, 10, PURCHASE_LISTING_LAYOUT);

    expect(saleManual.field).toBe("manual");
    expect(purchaseManual.field).toBe("manual");
    // A purchase has no toggle, so the columns the sale gives it are search.
    expect(cellAt(HEADER, 10, SALE_LISTING_LAYOUT).field).toBe("toggle");
  });

  test("a wide cell owns every column it spans", () => {
    expect(cellAt(TOP("a"), 1, SALE_LISTING_LAYOUT).field).toBe("name");
    expect(cellAt(TOP("a"), 8, SALE_LISTING_LAYOUT).field).toBe("name");
    expect(cellAt(TOP("a"), 9, SALE_LISTING_LAYOUT).field).toBe("grandTotal");
    expect(cellAt(TOP("a"), 11, SALE_LISTING_LAYOUT).field).toBe("x");
    expect(cellAt(BOTTOM("a"), 9, SALE_LISTING_LAYOUT).field).toBe("diskon");
  });

  test("a column outside every cell snaps to the nearest selectable one", () => {
    // Column 0 is the number / drag handle: not selectable, so it snaps right.
    expect(cellAt(TOP("a"), 0, SALE_LISTING_LAYOUT).field).toBe("name");
    expect(cellAt(BOTTOM("a"), 0, SALE_LISTING_LAYOUT).field).toBe("code");
  });

  test("moving into a cell keeps the column when it is inside, clamps when it is not", () => {
    const name = cellAt(TOP("a"), 5, SALE_LISTING_LAYOUT);
    expect(columnIn(name, 5)).toBe(5);
    expect(columnIn(name, 10)).toBe(8);
    expect(columnIn(name, 0)).toBe(1);
  });

  test("the rows are the header then each card's two halves, in order", () => {
    const rows = rowsFor(["a", "b"]);
    expect(rows).toEqual([HEADER, TOP("a"), BOTTOM("a"), TOP("b"), BOTTOM("b")]);
    expect(sameRow(TOP("a"), BOTTOM("a"))).toBe(false);
    expect(sameRow(TOP("a"), TOP("a"))).toBe(true);
    expect(sameRow(HEADER, HEADER)).toBe(true);
    expect(sameRow(HEADER, TOP("a"))).toBe(false);
  });

  test("every card field starts on a column a card actually has", () => {
    expect(startOf("name")).toBe(1);
    expect(startOf("qty")).toBe(5);
    expect(startOf("price")).toBe(7);
    expect(startOf("diskon")).toBe(9);
  });

  test("only selectable cells are walkable, and the header always has two", () => {
    const header = selectableCells(HEADER, SALE_LISTING_LAYOUT);
    expect(header.map((cell) => cell.field)).toEqual(["search", "manual", "toggle"]);
    expect(selectableCells(HEADER, PURCHASE_LISTING_LAYOUT)).toHaveLength(2);
    // `no#` and the drag handle draw but are skipped by the arrows.
    expect(selectableCells(TOP("a"), SALE_LISTING_LAYOUT).map((cell) => cell.field)).toEqual([
      "name",
      "grandTotal",
      "x",
    ]);
    expect(selectableCells(BOTTOM("a"), SALE_LISTING_LAYOUT).map((cell) => cell.field)).toEqual([
      "code",
      "qty",
      "unit",
      "price",
      "diskon",
    ]);
  });
});
