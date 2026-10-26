import { describe, expect, test } from "bun:test";
import { extraSchema, isDual, KIND_LABEL, withDual } from "./util-extra-options";

/**
 * The extra (surcharge) form and the `flag` bit it edits. `dual` is bit 0 of
 * `extras.extra_flag`; a charge that carries it also books its own outcoming
 * record, so a bit written wrong changes the books, not just the form. The
 * percent cap is the other money rule: a 150% charge is a typo, not a charge.
 */
const values = (overrides: Record<string, unknown> = {}) => ({
  name: "Ongkir",
  value: "10000",
  kind: "number" as const,
  dual: false,
  ...overrides,
});

describe("extraSchema", () => {
  test("a flat charge is valid", () => {
    expect(extraSchema.safeParse(values()).success).toBe(true);
  });

  test("a name is required — whitespace is not a name", () => {
    const parsed = extraSchema.safeParse(values({ name: "   " }));
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("Harus ada");
    }
  });

  test("the value is typed as text and must still read as a number", () => {
    for (const value of ["abc", "NaN", "Infinity"]) {
      const parsed = extraSchema.safeParse(values({ value }));
      expect(parsed.success).toBe(false);
      expect(parsed.success === false && parsed.error.issues[0].message).toBe("Harus angka");
    }
    expect(extraSchema.safeParse(values({ value: "12.5" })).success).toBe(true);
    // An empty box reads as 0 rather than as a missing value: `Number("")` is 0,
    // and the check only asks whether the text reads as a number.
    expect(extraSchema.safeParse(values({ value: "" })).success).toBe(true);
  });

  test("a percent may not exceed 100 in either direction", () => {
    for (const value of ["150", "-150"]) {
      const parsed = extraSchema.safeParse(values({ kind: "percent", value }));
      expect(parsed.success).toBe(false);
      expect(parsed.success === false && parsed.error.issues[0].message).toBe(
        "Tidak boleh lebih dari 100 atau kurang dari -100",
      );
    }
  });

  test("100% is a charge; 150 as a flat amount is fine", () => {
    expect(extraSchema.safeParse(values({ kind: "percent", value: "100" })).success).toBe(true);
    expect(extraSchema.safeParse(values({ kind: "percent", value: "-100" })).success).toBe(true);
    expect(extraSchema.safeParse(values({ kind: "number", value: "150" })).success).toBe(true);
  });
});

describe("the dual flag", () => {
  test("reads bit 0 only", () => {
    expect(isDual(0)).toBe(false);
    expect(isDual(1)).toBe(true);
    // Bit 1 is a different flag; it must not read as dual.
    expect(isDual(2)).toBe(false);
    expect(isDual(3)).toBe(true);
  });

  test("sets and clears bit 0 without disturbing the others", () => {
    expect(withDual(0b10, true)).toBe(0b11);
    expect(withDual(0b11, false)).toBe(0b10);
    expect(withDual(0, false)).toBe(0);
    expect(withDual(0b100, true)).toBe(0b101);
  });
});

describe("KIND_LABEL", () => {
  test("names both kinds the form offers", () => {
    expect(KIND_LABEL).toEqual({ percent: "Persen", number: "Angka" });
  });
});
