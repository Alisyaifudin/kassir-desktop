import { describe, expect, test } from "bun:test";
import { nearestRow, type AnchorRow } from "./anchor";

/**
 * A stored position is a *value*, so putting it back means finding the row that
 * value names — always, because a filter or a refetch can take that exact row
 * away and the list still has to land somewhere sensible.
 */
function rows(...values: number[]): AnchorRow[] {
  return values.map((value, index) => ({ id: `r${index}`, value }));
}

describe("nearestRow", () => {
  test("a value that is still in the list names its own row", () => {
    expect(nearestRow(rows(500, 400, 300, 200, 100), 300)).toBe(2);
  });

  test("a row that is gone is replaced by the closest value left", () => {
    // 350 was removed by a filter: 400 is nearer than 300.
    expect(nearestRow(rows(500, 400, 300, 200, 100), 350)).toBe(1);
  });

  test("the first of two equal rows wins, so a visit does not drift down the list", () => {
    expect(nearestRow(rows(100, 100, 100), 100)).toBe(0);
  });

  test("the order the list is shown in does not change which value is found", () => {
    expect(rows(100, 200, 300, 400)[nearestRow(rows(100, 200, 300, 400), 260)].value).toBe(300);
    expect(rows(400, 300, 200, 100)[nearestRow(rows(400, 300, 200, 100), 260)].value).toBe(300);
  });

  test("a value outside the list lands on the nearest end", () => {
    expect(nearestRow(rows(500, 400, 300), 9_000)).toBe(0);
    expect(nearestRow(rows(500, 400, 300), -50)).toBe(2);
  });

  test("a single row is the only answer", () => {
    expect(nearestRow(rows(42), 0)).toBe(0);
  });
});
