import { describe, expect, test } from "bun:test";
import { allocateFifo, depleteLots, type StockLot } from "./stock-sql";

const lots: StockLot[] = [
  { id: "old", value: 3, capital: 100 },
  { id: "empty", value: 0, capital: 90 },
  { id: "new", value: 5, capital: 200 },
];

describe("FIFO lot allocation", () => {
  test("takes from the oldest positive lot first", () => {
    const { takes, shortage } = allocateFifo(lots, 4);
    expect(takes.map(({ lot, take }) => [lot.id, take])).toEqual([
      ["old", 3],
      ["new", 1],
    ]);
    expect(shortage).toBe(0);
  });

  test("reports an uncovered remainder rather than planning negative stock", () => {
    const { takes, shortage } = allocateFifo(lots, 10);
    expect(takes.map(({ lot, take }) => [lot.id, take])).toEqual([
      ["old", 3],
      ["new", 5],
    ]);
    expect(shortage).toBe(2);
  });

  test("depletes the caller's lot snapshot without changing the source", () => {
    const afterFirstLine = depleteLots(lots, 4);
    const afterSecondLine = depleteLots(afterFirstLine, 3);
    expect(afterFirstLine.map((lot) => lot.value)).toEqual([0, 0, 4]);
    expect(afterSecondLine.map((lot) => lot.value)).toEqual([0, 0, 1]);
    expect(lots.map((lot) => lot.value)).toEqual([3, 0, 5]);
    expect(afterSecondLine.map((lot) => lot.capital)).toEqual([100, 90, 200]);
  });
});
