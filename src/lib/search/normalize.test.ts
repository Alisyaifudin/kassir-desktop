import { describe, expect, test } from "bun:test";
import { analyze, compact, norm } from "./normalize";

/**
 * The search boxes index a normalised copy of the field, never the displayed
 * string: casing, accents, punctuation and the separators inside a barcode all
 * have to disappear before the ladder compares anything. A miss here is a
 * listing the cashier can see and cannot find.
 */
describe("norm", () => {
  test("casefolds and strips accents, so `Café` finds `cafe`", () => {
    expect(norm("Café")).toBe("cafe");
    expect(norm("NASI GORENG")).toBe("nasi goreng");
  });

  test("turns punctuation into single spaces and trims", () => {
    expect(norm("  (90) NA-1121  ")).toBe("90 na 1121");
    expect(norm("Kopi☕ — Susu.")).toBe("kopi susu");
  });

  test("keeps every digit and letter", () => {
    expect(norm("Indomie Goreng 85g")).toBe("indomie goreng 85g");
  });

  test("is idempotent: a normalised value normalises to itself", () => {
    for (const value of ["Café!", "  a   b  ", "100%", "…"]) {
      expect(norm(norm(value))).toBe(norm(value));
    }
  });
});

describe("compact", () => {
  test("drops the separators a barcode is printed with", () => {
    expect(compact("(90) NA-1121")).toBe("90na1121");
    expect(compact("0896 8650 11")).toBe("0896865011");
  });

  test("is `norm` without spaces", () => {
    expect(compact("Kopi Susu")).toBe(norm("Kopi Susu").replace(/ /g, ""));
  });
});

describe("analyze", () => {
  test("returns the normalised text and its words in one pass", () => {
    expect(analyze("Nasi  Goreng")).toEqual({ norm: "nasi goreng", words: ["nasi", "goreng"] });
  });

  test("an empty or symbol-only value has no words", () => {
    expect(analyze("")).toEqual({ norm: "", words: [] });
    expect(analyze("…—")).toEqual({ norm: "", words: [] });
  });
});
