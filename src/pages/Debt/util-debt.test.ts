/**
 * Behaviour checks for the debt table's total and sorting.
 *
 * Run with:  bun test src/pages/Debt/util-debt.test.ts
 */
import { describe, expect, test } from "bun:test";
import type { DebtRecord } from "~/services/record";
import { sortDebt, totalDebt } from "./util-debt";

const debt = (id: string, paidAt: number, total: number): DebtRecord => ({
  id,
  paidAt,
  total,
  note: "",
  fix: 0,
});

describe("totalDebt", () => {
  test("sums what is owed", () => {
    expect(totalDebt([debt("a", 1, 5000), debt("b", 2, 2500)])).toBe(7500);
  });

  test("no debt means zero", () => {
    expect(totalDebt([])).toBe(0);
  });

  test("does not drift on cents the way float addition does", () => {
    // 0.1 + 0.2 is 0.30000000000000004 as a float sum
    expect(totalDebt([debt("a", 1, 0.1), debt("b", 2, 0.2)])).toBe(0.3);
  });

  test("carries a credit back down", () => {
    expect(totalDebt([debt("a", 1, 12000), debt("b", 2, -2000)])).toBe(10000);
  });
});

describe("sortDebt", () => {
  const records = [debt("b", 20, 300), debt("a", 10, 100), debt("c", 30, 200)];

  test("sorts by date, ascending and descending", () => {
    expect(sortDebt(records, "paidAt", "asc").map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(sortDebt(records, "paidAt", "desc").map((r) => r.id)).toEqual(["c", "b", "a"]);
  });

  test("sorts by total, ascending and descending", () => {
    expect(sortDebt(records, "total", "asc").map((r) => r.id)).toEqual(["a", "c", "b"]);
    expect(sortDebt(records, "total", "desc").map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  test("leaves the caller's list alone", () => {
    const source = [debt("b", 20, 300), debt("a", 10, 100)];
    const before = source.map((r) => r.id);
    sortDebt(source, "total", "asc");
    expect(source.map((r) => r.id)).toEqual(before);
  });
});
