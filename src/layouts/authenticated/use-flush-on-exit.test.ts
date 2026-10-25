import { describe, expect, test } from "bun:test";
import { closeDecision } from "./use-flush-on-exit";

/**
 * What a window close does with the cart flush's answer.
 *
 * The hook is not renderable outside Tauri, but this decision is the part that
 * cannot be got wrong: hold the window while the sale is still on screen, and let
 * the next attempt through. Holding it every time is an app with no way out — the
 * bug this policy exists for.
 */
describe("closeDecision", () => {
  test("a clean flush closes the window", () => {
    expect(closeDecision(null, false)).toBe("close");
    expect(closeDecision(null, true)).toBe("close");
  });

  test("the first failure holds the window, so the operator hears about it", () => {
    expect(closeDecision("Keranjang belum tersimpan: disk penuh", false)).toBe("hold");
  });

  test("the second attempt closes anyway: an app that cannot be quit is worse", () => {
    expect(closeDecision("Keranjang belum tersimpan: disk penuh", true)).toBe("close");
  });
});
