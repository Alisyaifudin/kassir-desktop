import { describe, expect, test } from "bun:test";
import { validateRecordLine, type RecordLine } from "./validate-line";

/**
 * Both writers — the live cart (`add.draft`) and the Settings → Data import
 * (`add.external`) — pass a line through this one check before it may move
 * stock. Stock is event-sourced, so a line that slips through writes permanent
 * history: a purchase with `qty: -3` used to create a negative lot, and a line
 * whose discounts took the whole price used to commit a total of zero.
 *
 * The messages are also load-bearing: the grids and the e2e specs match on the
 * qty string word for word.
 */
const line = (overrides: Partial<RecordLine> = {}): RecordLine => ({
  name: "Aqua",
  qty: 2,
  price: 3000,
  listingId: "l1",
  unit: 1,
  ...overrides,
});

describe("validateRecordLine", () => {
  test("a sound line passes", () => {
    expect(validateRecordLine(line())).toBeNull();
    expect(validateRecordLine(line({ capital: 2000, discounts: [{ eff: 500 }] }))).toBeNull();
    // An import omits `unit`; the service reads it from the listing link.
    expect(validateRecordLine(line({ unit: undefined }))).toBeNull();
  });

  test("a quantity the stock loop cannot consume is refused", () => {
    // `consumeStatements` starts at `remaining = qty` and loops `while
    // remaining > 0`, so a negative or zero qty moves no stock and still writes
    // the total — the sale happens for free.
    expect(validateRecordLine(line({ qty: -3 }))).toBe("Jumlah barang tidak valid");
    expect(validateRecordLine(line({ qty: 0 }))).toBe("Jumlah barang tidak valid");
    expect(validateRecordLine(line({ qty: Number.NaN }))).toBe("Jumlah barang tidak valid");
    expect(validateRecordLine(line({ qty: Number.POSITIVE_INFINITY }))).toBe(
      "Jumlah barang tidak valid",
    );
  });

  test("a unit that is not a positive whole number of pieces is refused", () => {
    expect(validateRecordLine(line({ unit: 0 }))).toBe("Satuan Aqua tidak valid");
    expect(validateRecordLine(line({ unit: -1 }))).toBe("Satuan Aqua tidak valid");
    expect(validateRecordLine(line({ unit: 1.5 }))).toBe("Satuan Aqua tidak valid");
  });

  test("the message names the line, or says `barang` when it has no name yet", () => {
    // A manual line can reach the check before its name is typed.
    expect(validateRecordLine(line({ name: "  ", price: -1 }))).toBe("Harga barang tidak valid");
    expect(validateRecordLine(line({ name: "Aqua", price: -1 }))).toBe("Harga Aqua tidak valid");
  });

  test("a negative price or capital is refused", () => {
    expect(validateRecordLine(line({ price: -1 }))).toBe("Harga Aqua tidak valid");
    expect(validateRecordLine(line({ price: Number.NaN }))).toBe("Harga Aqua tidak valid");
    expect(validateRecordLine(line({ capital: -1 }))).toBe("Modal Aqua tidak valid");
  });

  test("a manual line with no name is refused", () => {
    expect(validateRecordLine(line({ listingId: null, name: " " }))).toBe(
      "Nama barang manual harus diisi",
    );
    // A named manual line is fine — nothing is being renamed.
    expect(validateRecordLine(line({ listingId: null, name: "Ongkir" }))).toBeNull();
  });

  test("a discount stack that takes the whole line is not a sale", () => {
    // Equal to the line total is still refused: the goods would leave for free.
    expect(
      validateRecordLine(line({ price: 1000, qty: 2, discounts: [{ eff: 2000 }] })),
    ).toBe("Diskon Aqua melebihi harga barang");
    expect(
      validateRecordLine(line({ price: 1000, qty: 2, discounts: [{ eff: 900 }, { eff: 1100 }] })),
    ).toBe("Diskon Aqua melebihi harga barang");
    // One rupiah short is a sale.
    expect(
      validateRecordLine(line({ price: 1000, qty: 2, discounts: [{ eff: 1000 }, { eff: 999 }] })),
    ).toBeNull();
  });

  test("the discount check adds in decimal, not in floats", () => {
    // `eff` values come from percentages, so the sum has to be exact: in floats
    // 0.7 + 0.4 is 1.0999999999999999, which would let a line whose discounts
    // cover the whole 1.1 price slip through.
    const discounts = [{ eff: 0.7 }, { eff: 0.4 }];
    expect(validateRecordLine(line({ price: 1.1, qty: 1, discounts }))).toBe(
      "Diskon Aqua melebihi harga barang",
    );
  });
});
