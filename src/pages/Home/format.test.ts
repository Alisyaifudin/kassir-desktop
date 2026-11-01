import { describe, expect, test } from "bun:test";
import { formatMoney } from "./format";

/**
 * Beranda's display helper: what a card shows ("Rp 1.000" with a space,
 * Indonesian grouping).
 *
 * There used to be a second one, `withUrlBack`, which stamped `url_back=/` onto
 * every destination so the screen it opened could come back here. Beranda is the
 * root of the app's own navigation stack, so every screen it opens already has it
 * behind — the helper, and the tests that pinned its encoding, are gone.
 */
describe("formatMoney", () => {
  test("writes rupiah with a space and the Indonesian grouping", () => {
    expect(formatMoney(0)).toBe("Rp 0");
    expect(formatMoney(1_000)).toBe("Rp 1.000");
    expect(formatMoney(1_234_567)).toBe("Rp 1.234.567");
  });

  test("a negative amount keeps its sign after the mark", () => {
    expect(formatMoney(-1_234)).toBe("Rp -1.234");
  });

  test("no decimals are invented for a whole amount", () => {
    expect(formatMoney(1_000.5)).toBe("Rp 1.000,5");
  });
});
