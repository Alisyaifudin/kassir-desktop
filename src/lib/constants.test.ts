import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  DEFAULTABLE_KINDS,
  getProductKind,
  METHOD_BASE_ID,
  METHOD_BY_KEY,
  METHOD_KBD,
  METHOD_NAMES,
  METHODS,
  MODE_NAMES,
  version,
} from "./constants";

/**
 * The method tables are four views of one list, and the number keys are the
 * cashier's fastest path through a payment: Ctrl+0..3 must pick the kinds in
 * `METHODS` order, and the built-in ids are what an old record's `method_id`
 * points at. A table that drifts from the list is a wrong payment, not a wrong
 * label.
 */
describe("method tables", () => {
  test("the Ctrl keys pick the kinds in METHODS order", () => {
    METHODS.forEach((kind, index) => {
      expect(METHOD_BY_KEY[String(index)]).toBe(kind);
    });
    expect(Object.keys(METHOD_BY_KEY)).toHaveLength(METHODS.length);
  });

  test("every kind has a display name and a key hint", () => {
    for (const kind of METHODS) {
      expect(METHOD_NAMES[kind]).not.toBe("");
      expect(METHOD_KBD[kind]).toMatch(/^Ctrl\+\d$/);
    }
  });

  test("the built-in ids are the ones migration-31 seeded", () => {
    // Records written before the catalogue existed reference these rows.
    expect(METHOD_BASE_ID).toEqual({
      cash: "1000",
      qris: "1003",
      transfer: "1001",
      debit: "1002",
    });
    expect(Object.keys(METHOD_BASE_ID)).toHaveLength(METHODS.length);
  });

  test("only the non-cash kinds can be a default", () => {
    // Cash is what the others fall back to, so it is never itself a default.
    expect(DEFAULTABLE_KINDS).not.toContain("cash");
    for (const kind of DEFAULTABLE_KINDS) expect(METHODS).toContain(kind);
  });
});

describe("getProductKind", () => {
  test("names the three seeded kinds", () => {
    expect(getProductKind("retail")).toBe("Ecer");
    expect(getProductKind("wholesale")).toBe("Grosir");
    expect(getProductKind("marketplace")).toBe("Online");
  });

  test("a free-text kind is shown as typed rather than dropped", () => {
    expect(getProductKind("karton")).toBe("karton");
    expect(getProductKind("")).toBe("");
  });
});

describe("MODE_NAMES", () => {
  test("names both directions the UI toggles between", () => {
    expect(MODE_NAMES).toEqual({ incoming: "Masuk", outcoming: "Keluar" });
  });
});

describe("version", () => {
  test("is the version package.json ships", () => {
    // Setting prints this as "Kassir versi …"; forgetting one of the bump sites
    // leaves the app reporting a version it is not.
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
    expect(version).toBe(pkg.version);
  });
});
