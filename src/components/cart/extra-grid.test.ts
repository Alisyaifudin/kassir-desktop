/**
 * Pins the extras grid's keyboard geometry — the listing grid's rules plus the
 * two pieces only this grid has: the purchase screen's `Subtotal Barang` row and
 * the sale screen's stage toggle. Both are driven by `ExtraLayout`, so a screen
 * that forgets one is a failing test rather than a keyboard bug found by a
 * cashier.
 *
 * The `dual` column is pinned here too: it sits between `eff` and `x`, is one
 * column wide, is reached by the same arrow walk as every other cell — and is
 * absent on a purchase, whose `eff` readout takes that column instead.
 *
 * Run with:  bun test src/components/cart/extra-grid.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  PURCHASE_EXTRA_LAYOUT,
  SALE_EXTRA_LAYOUT,
  extraCellAt,
  extraCellsForRow,
  extraColumnIn,
  extraRowsFor,
  sameExtraRow,
  selectableExtraCells,
  startOfExtraField,
  type ExtraRowRef,
} from "./extra-grid";

const HEADER: ExtraRowRef = { kind: "header" };
const SUBTOTAL: ExtraRowRef = { kind: "subtotal" };
const ROW = (extraId: string): ExtraRowRef => ({ kind: "extra", extraId });

describe("extras grid geometry", () => {
  test("a sale's header ends in the stage toggle, a purchase's does not", () => {
    expect(extraCellsForRow(HEADER, SALE_EXTRA_LAYOUT).map((cell) => cell.field)).toEqual([
      "search",
      "manual",
      "toggle",
    ]);
    expect(extraCellsForRow(HEADER, PURCHASE_EXTRA_LAYOUT).map((cell) => cell.field)).toEqual([
      "search",
      "manual",
    ]);
  });

  test("the subtotal row exists only on the purchase screen, between the header and the extras", () => {
    expect(extraRowsFor(["a", "b"], PURCHASE_EXTRA_LAYOUT)).toEqual([
      HEADER,
      SUBTOTAL,
      ROW("a"),
      ROW("b"),
    ]);
    expect(extraRowsFor(["a", "b"], SALE_EXTRA_LAYOUT)).toEqual([HEADER, ROW("a"), ROW("b")]);
  });

  test("the subtotal is one full-width cell", () => {
    const cells = extraCellsForRow(SUBTOTAL, PURCHASE_EXTRA_LAYOUT);
    expect(cells).toHaveLength(1);
    expect(cells[0]?.field).toBe("subtotal");
    expect(cells[0]?.start).toBe(0);
    expect(cells[0]?.end).toBe(11);
    expect(extraCellAt(SUBTOTAL, 7, PURCHASE_EXTRA_LAYOUT).field).toBe("subtotal");
  });

  test("an extra row walks name, value, kind, eff, dual, x — never the number", () => {
    expect(selectableExtraCells(ROW("a"), SALE_EXTRA_LAYOUT).map((cell) => cell.field)).toEqual([
      "name",
      "value",
      "kind",
      "eff",
      "dual",
      "x",
    ]);
    expect(extraCellAt(ROW("a"), 0, SALE_EXTRA_LAYOUT).field).toBe("name");
    expect(extraCellAt(ROW("a"), 11, SALE_EXTRA_LAYOUT).field).toBe("x");
  });

  test("dual is one column between eff and x, selectable and not editable", () => {
    const cells = extraCellsForRow(ROW("a"), SALE_EXTRA_LAYOUT);
    const dual = cells.find((cell) => cell.field === "dual");
    expect(dual).toEqual({ field: "dual", start: 10, end: 10, selectable: true, editable: false });
    expect(cells.find((cell) => cell.field === "eff")?.end).toBe(9);
    expect(cells.find((cell) => cell.field === "x")?.start).toBe(11);
  });

  test("a purchase has no dual column at all — the twin is a sale-side rule", () => {
    const cells = extraCellsForRow(ROW("a"), PURCHASE_EXTRA_LAYOUT);
    expect(cells.map((cell) => cell.field)).toEqual(["no", "name", "value", "kind", "eff", "x"]);
    // The readout takes the spare column, so the row still ends on delete.
    expect(cells.find((cell) => cell.field === "eff")).toEqual({
      field: "eff",
      start: 8,
      end: 10,
      selectable: true,
      editable: false,
    });
    expect(cells.find((cell) => cell.field === "x")?.start).toBe(11);
    expect(selectableExtraCells(ROW("a"), PURCHASE_EXTRA_LAYOUT).map((cell) => cell.field)).toEqual([
      "name",
      "value",
      "kind",
      "eff",
      "x",
    ]);
  });

  test("a column outside a cell snaps to the nearest one and the remembered column is clamped", () => {
    const name = extraCellAt(HEADER, 5, SALE_EXTRA_LAYOUT);
    expect(name.field).toBe("search");
    expect(extraColumnIn(name, 9)).toBe(7);
    expect(extraColumnIn(name, 2)).toBe(2);
  });

  test("rows compare by identity, not by position", () => {
    expect(sameExtraRow(ROW("a"), ROW("a"))).toBe(true);
    expect(sameExtraRow(ROW("a"), ROW("b"))).toBe(false);
    expect(sameExtraRow(HEADER, ROW("a"))).toBe(false);
    expect(sameExtraRow(SUBTOTAL, SUBTOTAL)).toBe(true);
  });

  test("every extra field starts on a column the row has", () => {
    expect(startOfExtraField("name", SALE_EXTRA_LAYOUT)).toBe(1);
    expect(startOfExtraField("value", SALE_EXTRA_LAYOUT)).toBe(4);
    expect(startOfExtraField("kind", SALE_EXTRA_LAYOUT)).toBe(6);
    expect(startOfExtraField("eff", SALE_EXTRA_LAYOUT)).toBe(8);
    expect(startOfExtraField("dual", SALE_EXTRA_LAYOUT)).toBe(10);
    expect(startOfExtraField("x", SALE_EXTRA_LAYOUT)).toBe(11);
    // A purchase starts its fields in the same columns; only `eff` is wider.
    expect(startOfExtraField("eff", PURCHASE_EXTRA_LAYOUT)).toBe(8);
    expect(startOfExtraField("x", PURCHASE_EXTRA_LAYOUT)).toBe(11);
  });
});
