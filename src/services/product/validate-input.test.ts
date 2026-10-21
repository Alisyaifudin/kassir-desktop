import { describe, expect, test } from "bun:test";
import type { ProductInput } from "~/services/product";
import { validateProductInput } from "./validate-input";

/**
 * The value rules `product.add` and the JSON import share. The import used to
 * accept `"price": -10000` and `"capital": -900` because it validated the shape
 * only, which put a negative row in `listings` that `transaction.submit` then
 * refused at `Bayar`, and a negative cost basis in the margin report.
 */
function product(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: "Kopi Susu",
    note: "",
    listings: [
      {
        name: "Kopi Susu 250ml",
        price: 15_000,
        unit: 1,
        kind: "retail",
        code: null,
        codeKind: null,
      },
    ],
    stocks: [{ value: 10, capital: 9_000 }],
    properties: [],
    ...overrides,
  };
}

const listing = (overrides: Record<string, unknown> = {}) => ({
  name: "Kopi Susu 250ml",
  price: 15_000,
  unit: 1,
  kind: "retail",
  code: null,
  codeKind: null,
  ...overrides,
});

describe("validateProductInput", () => {
  test("a valid product passes", () => {
    expect(validateProductInput(product())).toBeNull();
  });

  test("a zero price is allowed — a give-away is not a typo", () => {
    expect(validateProductInput(product({ listings: [listing({ price: 0 })] }))).toBeNull();
  });

  test("a negative price names the listing", () => {
    expect(validateProductInput(product({ listings: [listing({ price: -10_000 })] }))).toBe(
      "Harga Kopi Susu 250ml tidak valid",
    );
  });

  test("a non-finite price is refused", () => {
    expect(validateProductInput(product({ listings: [listing({ price: Number.NaN })] }))).toBe(
      "Harga Kopi Susu 250ml tidak valid",
    );
  });

  test("a unit below one is refused", () => {
    expect(validateProductInput(product({ listings: [listing({ unit: 0 })] }))).toBe(
      "Satuan Kopi Susu 250ml tidak valid",
    );
    expect(validateProductInput(product({ listings: [listing({ unit: 1.5 })] }))).toBe(
      "Satuan Kopi Susu 250ml tidak valid",
    );
  });

  test("a negative capital is refused", () => {
    expect(validateProductInput(product({ stocks: [{ value: 5, capital: -900 }] }))).toBe(
      "Modal Kopi Susu tidak valid",
    );
  });

  test("a negative stock value is refused", () => {
    expect(validateProductInput(product({ stocks: [{ value: -50, capital: 900 }] }))).toBe(
      "Stok Kopi Susu tidak valid",
    );
  });

  test("a non-finite stock value is refused", () => {
    expect(
      validateProductInput(product({ stocks: [{ value: Number.POSITIVE_INFINITY, capital: 1 }] })),
    ).toBe("Stok Kopi Susu tidak valid");
  });

  test("no listings is refused", () => {
    expect(validateProductInput(product({ listings: [] }))).toBe(
      "Produk Kopi Susu butuh minimal satu listing",
    );
  });

  test("no stocks is refused", () => {
    expect(validateProductInput(product({ stocks: [] }))).toBe(
      "Produk Kopi Susu butuh minimal satu stok",
    );
  });

  test("an empty name is refused", () => {
    expect(validateProductInput(product({ name: "  " }))).toBe("Nama produk harus diisi");
  });

  test("the same code twice in one product is refused", () => {
    const twice = product({
      listings: [
        listing({ code: "8991", codeKind: "barcode" }),
        listing({ name: "Kopi Susu 1L", code: "8991", codeKind: "barcode" }),
      ],
    });
    expect(validateProductInput(twice)).toBe("Kode 8991 dipakai dua kali di Kopi Susu");
  });
});
