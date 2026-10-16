/**
 * Behaviour checks for the per-tab method filter.
 *
 * Run with:  bun test src/pages/Method/util-method.test.ts
 */
import { describe, expect, test } from "bun:test";
import type { Method } from "~/services/method";
import { namedMethodsOf, type NamedMethod } from "./util-method";

const base = (id: string, kind: Method["kind"]): Method => ({
  id,
  name: null,
  kind,
  deletedAt: null,
});

const named = (id: string, name: string, kind: NamedMethod["kind"]): NamedMethod => ({
  id,
  name,
  kind,
  deletedAt: null,
});

describe("namedMethodsOf", () => {
  test("keeps the named rows of the asked-for kind", () => {
    const methods = [named("a", "BCA", "transfer"), named("b", "Mandiri", "transfer")];
    expect(namedMethodsOf(methods, "transfer").map((m) => m.name)).toEqual(["BCA", "Mandiri"]);
  });

  test("drops the kind's base row, whose name is null", () => {
    const methods = [base("1001", "transfer"), named("a", "BCA", "transfer")];
    expect(namedMethodsOf(methods, "transfer").map((m) => m.id)).toEqual(["a"]);
  });

  test("drops other kinds", () => {
    const methods = [named("a", "BCA", "transfer"), named("b", "BNI", "debit")];
    expect(namedMethodsOf(methods, "transfer").map((m) => m.id)).toEqual(["a"]);
  });

  test("cash has no tab, so nothing is returned for it as a base", () => {
    const methods = [base("1000", "cash"), named("a", "BCA", "transfer")];
    expect(namedMethodsOf(methods, "qris")).toEqual([]);
  });

  test("no methods at all is not an error", () => {
    expect(namedMethodsOf([], "debit")).toEqual([]);
  });

  test("keeps the row identity, so React keys stay stable", () => {
    const row = named("a", "BCA", "transfer");
    expect(namedMethodsOf([base("1001", "transfer"), row], "transfer")[0]).toBe(row);
  });
});
