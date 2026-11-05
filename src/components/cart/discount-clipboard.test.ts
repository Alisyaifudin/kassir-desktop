import { describe, expect, test } from "bun:test";
import {
  DISCOUNT_CLIPBOARD_PREFIX,
  parseDiscounts,
  serializeDiscounts,
} from "./discount-clipboard";

/** A discount stack has to survive the clipboard, and only a stack should parse. */
describe("discount clipboard", () => {
  test("round-trips a stack, dropping derived and empty rows", () => {
    const text = serializeDiscounts([
      { id: "a", value: 10, kind: "percent", eff: 1000, total: 9000 },
      { id: "b", value: 5000, kind: "number", eff: 5000, total: 4000 },
      { id: "c", value: 0, kind: "percent", eff: 0, total: 4000 },
    ]);

    expect(text.startsWith(DISCOUNT_CLIPBOARD_PREFIX)).toBe(true);
    expect(parseDiscounts(text)).toEqual([
      { value: 10, kind: "percent" },
      { value: 5000, kind: "number" },
    ]);
  });

  test("an empty stack travels as an empty stack", () => {
    const text = serializeDiscounts([
      { value: 0, kind: "percent", eff: 0, total: 0 },
    ]);
    expect(parseDiscounts(text)).toEqual([]);
  });

  test("plain clipboard text is not a discount", () => {
    expect(parseDiscounts("Kopi Susu")).toBeNull();
    expect(parseDiscounts("[{\"value\":10,\"kind\":\"percent\"}]")).toBeNull();
    expect(parseDiscounts(`${DISCOUNT_CLIPBOARD_PREFIX}not json`)).toBeNull();
    expect(parseDiscounts(`${DISCOUNT_CLIPBOARD_PREFIX}42`)).toBeNull();
  });

  test("a malformed row rejects the whole stack rather than half-reading it", () => {
    expect(parseDiscounts(`${DISCOUNT_CLIPBOARD_PREFIX}[{"value":10,"kind":"banana"}]`)).toBeNull();
    expect(parseDiscounts(`${DISCOUNT_CLIPBOARD_PREFIX}[{"value":"10","kind":"percent"}]`)).toBeNull();
    expect(parseDiscounts(`${DISCOUNT_CLIPBOARD_PREFIX}[{"value":-1,"kind":"percent"}]`)).toBeNull();
  });
});
