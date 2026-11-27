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
  horizontalNeighbour,
  rowsFor,
  sameRow,
  selectableCells,
  startOf,
  type RowRef,
} from "./listing-grid";

const HEADER: RowRef = { kind: "header" };
const TOP = (cardId: string): RowRef => ({ kind: "card", cardId, part: "top" });
const TOP_WITH_IMAGE = (cardId: string): RowRef => ({
  kind: "card",
  cardId,
  part: "top",
  image: true,
});
const BOTTOM = (cardId: string): RowRef => ({ kind: "card", cardId, part: "bottom" });
const BOTTOM_WITH_IMAGE = (cardId: string): RowRef => ({
  kind: "card",
  cardId,
  part: "bottom",
  image: true,
});
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

  test("`+manual` sits where the layout says, so Tab past `Nama` lands on it", () => {
    const saleManual = cellAt(HEADER, 9, SALE_LISTING_LAYOUT);
    const purchaseManual = cellAt(HEADER, 11, PURCHASE_LISTING_LAYOUT);

    expect(saleManual.field).toBe("manual");
    expect(purchaseManual.field).toBe("manual");
    // A purchase has no toggle, so the columns the sale gives it are search.
    expect(cellAt(HEADER, 11, SALE_LISTING_LAYOUT).field).toBe("toggle");
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
    expect(cellAt(TOP_WITH_IMAGE("a"), 0, SALE_LISTING_LAYOUT).field).toBe("image");
  });

  test("moving into a cell keeps the column when it is inside, clamps when it is not", () => {
    const name = cellAt(TOP("a"), 5, SALE_LISTING_LAYOUT);
    expect(columnIn(name, 5)).toBe(5);
    expect(columnIn(name, 12)).toBe(9);
    expect(columnIn(name, 0)).toBe(2);
  });

  test("the rows are the header then each card's two halves, in order", () => {
    const rows = rowsFor(["a", "b"]);
    expect(rows).toEqual([
      HEADER,
      TOP("a"),
      { kind: "card", cardId: "a", part: "bottom" },
      TOP("b"),
      { kind: "card", cardId: "b", part: "bottom" },
    ]);
    expect(sameRow(TOP("a"), BOTTOM("a"))).toBe(false);
    expect(sameRow(TOP("a"), TOP("a"))).toBe(true);
    expect(sameRow(HEADER, HEADER)).toBe(true);
    expect(sameRow(HEADER, TOP("a"))).toBe(false);
  });

  test("a card with a cover gets an image cell on both rows; one without gets none", () => {
    expect(selectableCells(TOP("a"), SALE_LISTING_LAYOUT).map((cell) => cell.field)).toEqual([
      "no",
      "name",
      "grandTotal",
      "x",
    ]);
    expect(
      selectableCells(TOP_WITH_IMAGE("a"), SALE_LISTING_LAYOUT).map((cell) => cell.field),
    ).toEqual(["image", "no", "name", "grandTotal", "x"]);
    // The photo is one box drawn beside both rows, so the cursor can stand in its
    // top half or its bottom half — which is what makes `down` on it stay on it.
    expect(
      selectableCells(BOTTOM_WITH_IMAGE("a"), SALE_LISTING_LAYOUT).map((cell) => cell.field),
    ).toEqual(["image", "grip", "code", "qty", "unit", "price", "diskon"]);
    expect(
      selectableCells(BOTTOM("a"), SALE_LISTING_LAYOUT).map((cell) => cell.field),
    ).not.toContain("image");
    expect(startOf("image")).toBe(0);
  });

  test("rowsFor marks both halves of the cards the caller says have a cover", () => {
    const rows = rowsFor(["a", "b"], (id) => id === "b");

    expect(rows[1]).not.toHaveProperty("image");
    expect(rows[2]).not.toHaveProperty("image");
    expect(rows[3]).toEqual({ kind: "card", cardId: "b", part: "top", image: true });
    expect(rows[4]).toEqual({ kind: "card", cardId: "b", part: "bottom", image: true });
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
      "no",
      "name",
      "grandTotal",
      "x",
    ]);
    expect(selectableCells(BOTTOM("a"), SALE_LISTING_LAYOUT).map((cell) => cell.field)).toEqual([
      "grip",
      "code",
      "qty",
      "unit",
      "price",
      "diskon",
    ]);
    // Nothing the cursor reaches is editable unless it holds a value.
    for (const cell of [...TOP_CELLS_OF("a"), ...BOTTOM_CELLS_OF("a")]) {
      if (cell.field === "no" || cell.field === "grip") expect(cell.editable).toBe(false);
    }
  });
});

/**
 * The photo's neighbours.
 *
 * The photo is one box drawn beside *both* rows of its card, and the walk treats
 * it as the first cell of each: `right` leaves into the half the cursor stands in
 * (the number above, the handle below), `left` leaves the card from either half —
 * the reading order would climb from the bottom half into the `x` of the row
 * above, a hop into the card out of a box that looks the same both ways.
 */
describe("the photo's neighbours", () => {
  // `a` has no cover, `b` does: only `b`'s rows carry the photo cell.
  const ROWS = rowsFor(["a", "b"], (id) => id === "b");
  const step = (row: RowRef, col: number, delta: number, wrap = false) =>
    horizontalNeighbour(ROWS, { row, col }, SALE_LISTING_LAYOUT, delta, { wrap });

  test("right out of the top half is the number", () => {
    const next = step(TOP_WITH_IMAGE("b"), 0, 1);

    expect(next?.cell.field).toBe("no");
    expect(next?.col).toBe(1);
    expect(next?.row).toEqual(TOP_WITH_IMAGE("b"));
  });

  test("right out of the bottom half is the handle", () => {
    const next = step(BOTTOM_WITH_IMAGE("b"), 0, 1);

    expect(next?.cell.field).toBe("grip");
    expect(next?.col).toBe(1);
    expect(next?.row).toEqual(BOTTOM_WITH_IMAGE("b"));
  });

  test("left out of the number lands back on the photo", () => {
    const next = step(TOP("b"), 1, -1);

    expect(next?.cell.field).toBe("image");
    expect(next?.row).toEqual(TOP_WITH_IMAGE("b"));
  });

  test("left out of the handle lands back on the photo too", () => {
    const next = step(BOTTOM("b"), 1, -1);

    expect(next?.cell.field).toBe("image");
    expect(next?.row).toEqual(BOTTOM_WITH_IMAGE("b"));
  });

  test("left out of the photo leaves for the previous card, from either half", () => {
    // Out of the card the photo opens — `a`'s last cell is the row above it.
    const fromTop = step(TOP_WITH_IMAGE("b"), 0, -1);
    expect(fromTop?.cell.field).toBe("diskon");
    expect(fromTop?.row).toEqual(BOTTOM("a"));

    // The bottom half is the same box: the same step, not a climb into `x`.
    const fromBottom = step(BOTTOM_WITH_IMAGE("b"), 0, -1);
    expect(fromBottom?.cell.field).toBe("diskon");
    expect(fromBottom?.row).toEqual(BOTTOM("a"));
  });

  test("the first card's photo leaves for the header", () => {
    const first = rowsFor(["b"], () => true);
    const next = horizontalNeighbour(
      first,
      { row: TOP_WITH_IMAGE("b"), col: 0 },
      SALE_LISTING_LAYOUT,
      -1,
    );

    expect(next?.row).toEqual(HEADER);
    expect(next?.cell.field).toBe("toggle");
  });

  test("a card without a photo keeps the plain reading order", () => {
    const next = step(BOTTOM("a"), 1, -1);

    expect(next?.row).toEqual(TOP("a"));
    expect(next?.cell.field).toBe("x");
  });

  test("the photo does not disturb the rest of either row", () => {
    expect(step(TOP_WITH_IMAGE("b"), 1, 1)?.cell.field).toBe("name");
    expect(step(BOTTOM_WITH_IMAGE("b"), 1, 1)?.cell.field).toBe("code");
  });

  test("an arrow that ran out of an editor still wraps the ends of the grid", () => {
    const next = step(HEADER, 1, -1, true);

    expect(next?.row).toEqual(BOTTOM_WITH_IMAGE("b"));
    expect(next?.cell.field).toBe("diskon");
  });
});
