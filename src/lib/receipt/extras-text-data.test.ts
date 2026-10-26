import { describe, expect, test } from "bun:test";
import type { RecordExtra } from "~/services/record";
import { MAXIMAL_SUMMARY_SPACE, type TextData } from "./type";
import { extrasTextData } from "./extras-text-data";

/**
 * Extras and deductions, printed right-aligned inside the summary column. The
 * sign is what carries the meaning — a deduction has to reach the paper as a
 * negative rupiah — and a percent extra keeps its percentage next to its name.
 */
const extra = (overrides: Partial<RecordExtra> = {}): RecordExtra => ({
  id: "e1",
  name: "Ongkir",
  value: 10_000,
  eff: 10_000,
  kind: "number",
  flag: 0,
  ...overrides,
});

/** Every row this section builds is a `spacebetween`; say so for the type. */
function rowAt(rows: TextData[], index: number): Extract<TextData, { kind: "spacebetween" }> {
  const row = rows[index];
  if (row.kind !== "spacebetween") throw new Error(`expected a spacebetween row, got ${row.kind}`);
  return row;
}

describe("extrasTextData", () => {
  test("a flat charge prints its name and rupiah, right-aligned to the summary column", () => {
    const rows = extrasTextData([extra()], 200);

    expect(rows).toEqual([
      {
        text: ["Ongkir", "Rp10.000"],
        size: "normal",
        kind: "spacebetween",
        x: 200 - MAXIMAL_SUMMARY_SPACE,
      },
    ]);
  });

  test("a narrow paper clamps the column to the paper width", () => {
    const rows = extrasTextData([extra()], 100);
    expect(rowAt(rows, 0).x).toBe(0);
  });

  test("a percent charge keeps its percentage in the label", () => {
    const rows = extrasTextData([extra({ kind: "percent", value: 10, eff: 5_000 })], 200);
    expect(rowAt(rows, 0).text).toEqual(["Ongkir 10%", "Rp5.000"]);
  });

  test("a deduction prints as a negative rupiah", () => {
    const rows = extrasTextData([extra({ eff: -5_000 })], 200);
    expect(rowAt(rows, 0).text).toEqual(["Ongkir", "-Rp5.000"]);
  });

  test("the list keeps its order and an empty list prints nothing", () => {
    const rows = extrasTextData(
      [extra({ name: "Ongkir" }), extra({ id: "e2", name: "Diskon", eff: -1_000 })],
      200,
    );
    expect(rows.map((_, index) => rowAt(rows, index).text[0])).toEqual(["Ongkir", "Diskon"]);
    expect(extrasTextData([], 200)).toEqual([]);
  });
});
