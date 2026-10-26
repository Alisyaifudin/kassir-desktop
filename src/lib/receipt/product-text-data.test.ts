import { describe, expect, test } from "bun:test";
import type { RecordListing } from "~/services/record";
import { productsTextData } from "./product-text-data";

/**
 * One block per line of goods: the name, then `price × qty` against the line
 * total, then a row per discount. The cashier and the customer check the money
 * against this block, so the discount label has to say what kind it was
 * (`Diskon 10%`, `Diskon 2pcs`) and every rupiah carries the record's `fix`.
 */
const line = (overrides: Partial<RecordListing> = {}): RecordListing => ({
  id: "l1",
  productId: "p1",
  name: "Kopi",
  kind: "product",
  unit: 1,
  price: 100_500,
  qty: 1,
  capital: 80_000,
  total: 100_500,
  discounts: [],
  portions: [],
  ...overrides,
});

describe("productsTextData", () => {
  test("a plain line prints its name, its unit price and its total", () => {
    const rows = productsTextData([line()], 0);

    expect(rows).toEqual([
      { kind: "long", text: "Kopi", size: "normal" },
      { kind: "spacebetween", text: ["100.500 x 1", "100.500"], size: "normal" },
      { kind: "linebreak", size: "normal" },
    ]);
  });

  test("the record's `fix` sets the decimals on every money cell", () => {
    const rows = productsTextData([line({ price: 100_500.456, total: 100_500.456 })], 2);

    expect(rows[1]).toEqual({
      kind: "spacebetween",
      text: ["100.500,46 x 1", "100.500,46"],
      size: "normal",
    });
    // `fix: 0` drops the cents entirely rather than printing ,00.
    expect(productsTextData([line()], 0)[1]).toEqual({
      kind: "spacebetween",
      text: ["100.500 x 1", "100.500"],
      size: "normal",
    });
  });

  test("each discount prints the label its kind calls for", () => {
    const rows = productsTextData(
      [
        line({
          discounts: [
            { id: "d1", kind: "number", value: 5_000, eff: 5_000 },
            { id: "d2", kind: "percent", value: 10, eff: 9_500 },
            { id: "d3", kind: "pcs", value: 2, eff: 2_000 },
          ],
        }),
      ],
      0,
    );

    expect(rows.slice(2, -1)).toEqual([
      { size: "normal", kind: "end", text: "(-5.000)" },
      { kind: "spacebetween", text: ["(Diskon 10%)", "(-9.500)"], size: "normal" },
      { kind: "spacebetween", text: ["(Diskon 2pcs)", "(-2.000)"], size: "normal" },
    ]);
  });

  test("a line with discounts keeps its trailing blank line", () => {
    const rows = productsTextData(
      [line({ discounts: [{ id: "d1", kind: "number", value: 1_000, eff: 1_000 }] })],
      0,
    );

    expect(rows.at(-1)).toEqual({ size: "normal", kind: "linebreak" });
  });

  test("lines print in the order they were rung up", () => {
    const rows = productsTextData([line({ name: "Kopi" }), line({ id: "l2", name: "Teh" })], 0);
    const names = rows.flatMap((row) => (row.kind === "long" ? [row.text] : []));

    expect(names).toEqual(["Kopi", "Teh"]);
  });
});
