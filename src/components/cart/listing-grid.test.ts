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
  COMBO_LISTING_LAYOUT,
  PURCHASE_LISTING_LAYOUT,
  SALE_LISTING_LAYOUT,
  cellAt,
  cellsForRow,
  columnIn,
  headerStartOf,
  horizontalNeighbour,
  rowsFor,
  sameRow,
  selectableCells,
  startOf,
  verticalNeighbour,
  type RowRef,
} from "./listing-grid";

const HEADER: RowRef = { kind: "header" };
const TOP = (cardId: string): RowRef => ({ kind: "card", cardId, part: "top" });
const BOTTOM = (cardId: string): RowRef => ({ kind: "card", cardId, part: "bottom" });
const TOP_CELLS_OF = (cardId: string) => cellsForRow(TOP(cardId), SALE_LISTING_LAYOUT);
const BOTTOM_CELLS_OF = (cardId: string) => cellsForRow(BOTTOM(cardId), SALE_LISTING_LAYOUT);

describe("listing grid geometry", () => {
  test("combo header uses the stage toggle without reserving a manual cell", () => {
    expect(cellsForRow(HEADER, COMBO_LISTING_LAYOUT)).toEqual([
      { field: "search", start: 1, end: 10, selectable: true, editable: true },
      { field: "toggle", start: 11, end: 12, selectable: true, editable: false },
    ]);
    expect(cellAt(HEADER, 11, COMBO_LISTING_LAYOUT).field).toBe("toggle");
  });

  test("a sale's header ends in the stage toggle, a purchase's does not", () => {
    const sale = cellsForRow(HEADER, SALE_LISTING_LAYOUT).map((cell) => cell.field);
    const purchase = cellsForRow(HEADER, PURCHASE_LISTING_LAYOUT).map((cell) => cell.field);

    expect(sale).toEqual(["search", "manual", "toggle"]);
    expect(purchase).toEqual(["search", "manual"]);
  });

  test("the cart's search bar starts at the very first column, over the photo's", () => {
    expect(headerStartOf("search", SALE_LISTING_LAYOUT)).toBe(0);
    expect(headerStartOf("manual", SALE_LISTING_LAYOUT)).toBe(9);
    expect(headerStartOf("toggle", SALE_LISTING_LAYOUT)).toBe(11);
    expect(headerStartOf("manual", PURCHASE_LISTING_LAYOUT)).toBe(11);
    // The combo stage draws no photo, so its twelve tracks are the columns *after*
    // the photo's and its search bar starts at 1.
    expect(headerStartOf("search", COMBO_LISTING_LAYOUT)).toBe(1);
  });

  test("a wide cell owns every column it spans", () => {
    expect(cellAt(TOP("a"), 2, SALE_LISTING_LAYOUT).field).toBe("name");
    expect(cellAt(TOP("a"), 9, SALE_LISTING_LAYOUT).field).toBe("name");
    expect(cellAt(TOP("a"), 10, SALE_LISTING_LAYOUT).field).toBe("grandTotal");
    expect(cellAt(TOP("a"), 12, SALE_LISTING_LAYOUT).field).toBe("x");
    expect(cellAt(BOTTOM("a"), 10, SALE_LISTING_LAYOUT).field).toBe("diskon");
  });

  test("column 1 is the number above and the drag handle below, column 0 the photo", () => {
    expect(cellAt(TOP("a"), 1, SALE_LISTING_LAYOUT).field).toBe("no");
    expect(cellAt(BOTTOM("a"), 1, SALE_LISTING_LAYOUT).field).toBe("grip");
    expect(cellAt(TOP("a"), 0, SALE_LISTING_LAYOUT).field).toBe("image");
    expect(cellAt(BOTTOM("a"), 0, SALE_LISTING_LAYOUT).field).toBe("image");
  });

  test("moving into a cell keeps the column when it is inside, clamps when it is not", () => {
    const name = cellAt(TOP("a"), 5, SALE_LISTING_LAYOUT);
    expect(columnIn(name, 5)).toBe(5);
    expect(columnIn(name, 12)).toBe(9);
    expect(columnIn(name, 0)).toBe(2);
  });

  test("the rows are the header then each card's two halves, in order", () => {
    const rows = rowsFor(["a", "b"]);
    expect(rows).toEqual([HEADER, TOP("a"), BOTTOM("a"), TOP("b"), BOTTOM("b")]);
    expect(sameRow(TOP("a"), BOTTOM("a"))).toBe(false);
    expect(sameRow(TOP("a"), TOP("a"))).toBe(true);
    expect(sameRow(HEADER, HEADER)).toBe(true);
    expect(sameRow(HEADER, TOP("a"))).toBe(false);
  });

  test("a cart card has the photo cell on both rows", () => {
    expect(selectableCells(TOP("a"), SALE_LISTING_LAYOUT).map((cell) => cell.field)).toEqual([
      "image",
      "no",
      "name",
      "grandTotal",
      "x",
    ]);
    // The photo is one box drawn beside both rows, so the cursor can stand in its
    // top half or its bottom half — which is what makes `down` on it stay on it.
    expect(selectableCells(BOTTOM("a"), SALE_LISTING_LAYOUT).map((cell) => cell.field)).toEqual([
      "image",
      "grip",
      "code",
      "qty",
      "unit",
      "price",
      "diskon",
    ]);
    expect(startOf("image")).toBe(0);
  });

  test("a layout without a photo column has none, and its cards start at `no#`", () => {
    // The combo stage: twelve tracks, the columns after the photo's.
    expect(selectableCells(TOP("a"), COMBO_LISTING_LAYOUT).map((cell) => cell.field)).toEqual([
      "no",
      "name",
      "grandTotal",
      "x",
    ]);
    expect(selectableCells(BOTTOM("a"), COMBO_LISTING_LAYOUT).map((cell) => cell.field)).toEqual([
      "grip",
      "code",
      "qty",
      "unit",
      "price",
      "diskon",
    ]);
    // Nothing owns column 0 there, so a remembered 0 clamps onto the number.
    expect(cellAt(TOP("a"), 0, COMBO_LISTING_LAYOUT).field).toBe("no");
  });

  test("every card field starts on a column a card actually has", () => {
    expect(startOf("image")).toBe(0);
    expect(startOf("no")).toBe(1);
    expect(startOf("grip")).toBe(1);
    expect(startOf("name")).toBe(2);
    expect(startOf("qty")).toBe(6);
    expect(startOf("unit")).toBe(7);
    expect(startOf("price")).toBe(8);
    expect(startOf("diskon")).toBe(10);
  });

  test("only selectable cells are walkable, and the header always has two", () => {
    const header = selectableCells(HEADER, SALE_LISTING_LAYOUT);
    expect(header.map((cell) => cell.field)).toEqual(["search", "manual", "toggle"]);
    expect(selectableCells(HEADER, PURCHASE_LISTING_LAYOUT)).toHaveLength(2);
    // `no#` opens the product sheet and the handle locks the card, so both are
    // cells the cursor can stand on — neither is a field.
    expect(selectableCells(TOP("a"), SALE_LISTING_LAYOUT).map((cell) => cell.field)).toEqual([
      "image",
      "no",
      "name",
      "grandTotal",
      "x",
    ]);
    // Nothing the cursor reaches is editable unless it holds a value.
    for (const cell of [...TOP_CELLS_OF("a"), ...BOTTOM_CELLS_OF("a")]) {
      if (cell.field === "no" || cell.field === "grip" || cell.field === "image") {
        expect(cell.editable).toBe(false);
      }
    }
  });
});

/**
 * The photo's neighbours, left and right.
 *
 * The photo is one box drawn beside *both* rows of its card, and the walk treats it
 * as the first cell of each: `right` leaves into the half the cursor stands in (the
 * number above, the handle below), `left` leaves the card from either half — the
 * reading order would climb from the bottom half into the `x` of the row above, a
 * hop into the card out of a box that looks the same both ways.
 */
describe("the photo's neighbours", () => {
  const ROWS = rowsFor(["a", "b"]);
  const step = (row: RowRef, col: number, delta: number, wrap = false) =>
    horizontalNeighbour(ROWS, { row, col }, SALE_LISTING_LAYOUT, delta, { wrap });

  test("right out of the top half is the number", () => {
    const next = step(TOP("b"), 0, 1);

    expect(next?.cell.field).toBe("no");
    expect(next?.col).toBe(1);
    expect(next?.row).toEqual(TOP("b"));
  });

  test("right out of the bottom half is the handle", () => {
    const next = step(BOTTOM("b"), 0, 1);

    expect(next?.cell.field).toBe("grip");
    expect(next?.col).toBe(1);
    expect(next?.row).toEqual(BOTTOM("b"));
  });

  test("left out of the number lands back on the photo", () => {
    const next = step(TOP("b"), 1, -1);

    expect(next?.cell.field).toBe("image");
    expect(next?.row).toEqual(TOP("b"));
  });

  test("left out of the handle lands back on the photo too", () => {
    const next = step(BOTTOM("b"), 1, -1);

    expect(next?.cell.field).toBe("image");
    expect(next?.row).toEqual(BOTTOM("b"));
  });

  test("left out of the photo leaves for the previous card, from either half", () => {
    // Out of the card the photo opens — `a`'s last cell is the row above it.
    const fromTop = step(TOP("b"), 0, -1);
    expect(fromTop?.cell.field).toBe("diskon");
    expect(fromTop?.row).toEqual(BOTTOM("a"));

    // The bottom half is the same box: the same step, not a climb into `x`.
    const fromBottom = step(BOTTOM("b"), 0, -1);
    expect(fromBottom?.cell.field).toBe("diskon");
    expect(fromBottom?.row).toEqual(BOTTOM("a"));
  });

  test("the first card's photo leaves for the header", () => {
    const first = rowsFor(["b"]);
    const next = horizontalNeighbour(first, { row: TOP("b"), col: 0 }, SALE_LISTING_LAYOUT, -1);

    expect(next?.row).toEqual(HEADER);
    expect(next?.cell.field).toBe("toggle");
  });

  test("a card layout without a photo keeps the plain reading order", () => {
    // The first cell of the combo stage's card is `no#`, so its `grip`-left stays
    // the `x` of the row above.
    const next = horizontalNeighbour(ROWS, { row: BOTTOM("a"), col: 1 }, COMBO_LISTING_LAYOUT, -1);

    expect(next?.row).toEqual(TOP("a"));
    expect(next?.cell.field).toBe("x");
  });

  test("an arrow that ran out of an editor still wraps the ends of the grid", () => {
    const next = step(HEADER, 1, -1, true);

    expect(next?.row).toEqual(BOTTOM("b"));
    expect(next?.cell.field).toBe("diskon");
  });
});

/**
 * Up and down, where the photo is the one cell that is not simply "the same column
 * of the next row".
 *
 * It is drawn beside both rows of its card, so the row model carries it twice and a
 * plain step would spend a press moving between its own halves. A step off the photo
 * leaves for the neighbouring card's photo and lands in the half the direction came
 * from — top from above, bottom from below — which is the half `right` reads.
 */
describe("up and down on the photo", () => {
  const ROWS = rowsFor(["a", "b"]);
  const step = (row: RowRef, col: number, delta: number) =>
    verticalNeighbour(ROWS, { row, col }, SALE_LISTING_LAYOUT, delta);

  test("down off the top half is the next card's photo, not its own bottom half", () => {
    const next = step(TOP("a"), 0, 1);

    expect(next?.cell.field).toBe("image");
    expect(next?.row).toEqual(TOP("b"));
  });

  test("down off the bottom half is the next card's photo as well", () => {
    const next = step(BOTTOM("a"), 0, 1);

    expect(next?.cell.field).toBe("image");
    expect(next?.row).toEqual(TOP("b"));
  });

  test("up off either half lands on the previous card's bottom half", () => {
    // From the top half the row above is already the card before.
    expect(step(TOP("b"), 0, -1)?.row).toEqual(BOTTOM("a"));
    // From the bottom half its own top half is skipped.
    expect(step(BOTTOM("b"), 0, -1)?.row).toEqual(BOTTOM("a"));
  });

  test("every other column keeps its column, clamped by a wide neighbour", () => {
    const next = step(TOP("a"), 5, 1);

    expect(next?.cell.field).toBe("code");
    expect(next?.row).toEqual(BOTTOM("a"));

    // `diskon` ends at column 12; stepping down from `x` keeps 12 inside it.
    expect(step(TOP("a"), 12, 1)?.cell.field).toBe("diskon");
  });

  test("down out of the header lands on the first card", () => {
    const next = step(HEADER, 2, 1);

    expect(next?.row).toEqual(TOP("a"));
    expect(next?.cell.field).toBe("name");
  });

  test("the ends of the list have nowhere to go", () => {
    expect(step(BOTTOM("b"), 0, 1)).toBeUndefined();
    expect(step(HEADER, 2, -1)).toBeUndefined();
  });
});
