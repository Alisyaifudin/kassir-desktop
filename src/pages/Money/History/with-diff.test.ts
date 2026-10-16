/**
 * Behaviour checks for the history table's diff column.
 *
 * Run with:  bun test src/pages/Money/History/with-diff.test.ts
 */
import { describe, expect, test } from "bun:test";
import type { MoneyEntry } from "~/services/money";
import { withDiff } from "./with-diff";

const entry = (id: string, timestamp: number, value: number): MoneyEntry => ({
  id,
  pocketId: "p",
  timestamp,
  value,
  note: "",
  updatedAt: timestamp,
  syncAt: null,
  deletedAt: null,
});

describe("withDiff", () => {
  test("measures each entry against the one below it", () => {
    // newest first: 30, 20, 10
    const rows = withDiff([entry("c", 3, 30), entry("b", 2, 20), entry("a", 1, 10)], 5);
    expect(rows.map((row) => row.diff)).toEqual([10, 10, 5]);
  });

  test("measures the oldest entry against the balance before the range", () => {
    const rows = withDiff([entry("b", 2, 20), entry("a", 1, 10)], 7);
    expect(rows.map((row) => row.diff)).toEqual([10, 3]);
  });

  test("falls back to `previous` when the range holds one entry", () => {
    const rows = withDiff([entry("a", 1, 42)], 40);
    expect(rows.map((row) => row.diff)).toEqual([2]);
  });

  test("a negative movement keeps its sign", () => {
    const rows = withDiff([entry("b", 2, 8), entry("a", 1, 10)], 0);
    expect(rows.map((row) => row.diff)).toEqual([-2, 10]);
  });

  test("does not carry float noise from a running balance", () => {
    const rows = withDiff([entry("b", 2, 0.3), entry("a", 1, 0.1)], 0);
    expect(rows.map((row) => row.diff)).toEqual([0.2, 0.1]);
  });

  test("no entries means no rows", () => {
    expect(withDiff([], 99)).toEqual([]);
  });
});
