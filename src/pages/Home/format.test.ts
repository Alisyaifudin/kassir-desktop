import { describe, expect, test } from "bun:test";
import { formatMoney, withUrlBack } from "./format";

/**
 * Beranda's two display helpers. `formatMoney` is what a card shows ("Rp 1.000"
 * with a space, Indonesian grouping), and `withUrlBack` is the navigation
 * contract every link back to Beranda uses — the destination has to receive an
 * encoded in-app path, or the screen it opens cannot come back here.
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

describe("withUrlBack", () => {
  test("carries Beranda as an encoded in-app path", () => {
    expect(withUrlBack("/money")).toBe("/money?url_back=%2F");
  });

  test("an origin screen with its own query is encoded as one value", () => {
    expect(withUrlBack("/records", "/pos?draft=x")).toBe(
      "/records?url_back=%2Fpos%3Fdraft%3Dx",
    );
  });
});
