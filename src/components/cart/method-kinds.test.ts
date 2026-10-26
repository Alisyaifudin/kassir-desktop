/**
 * Pins the one-method-per-transaction rule the settle dialog enforces. A method
 * is an id, not a kind: `QRIS Mandiri` and `QRIS BNI` are two methods, and a
 * draft paying one may add the other — but never the same id twice. `+` lands on
 * the next kind with a free method (Tunai → QRIS → Transfer → Debit), whose
 * default account if it is still free.
 *
 * Run with:  bun test src/components/cart/method-kinds.test.ts
 */
import { describe, expect, test } from "bun:test";
import { freeMethodId, kindExhausted, methodIdsOfKind, nextFreeKind } from "./method-kinds";
import type { MethodCatalog } from "~/services/method";

/** The four base methods, with two named QRIS accounts and BCA for transfer. */
const CATALOG: MethodCatalog = {
  methods: [
    { id: "1000", name: null, kind: "cash", deletedAt: null },
    { id: "1003", name: null, kind: "qris", deletedAt: null },
    { id: "1001", name: null, kind: "transfer", deletedAt: null },
    { id: "1002", name: null, kind: "debit", deletedAt: null },
    { id: "2001", name: "Mandiri", kind: "qris", deletedAt: null },
    { id: "2002", name: "BNI", kind: "qris", deletedAt: null },
    { id: "2003", name: "BCA", kind: "transfer", deletedAt: null },
  ],
  defaults: { qris: "2001", transfer: "2003" },
};

const taken = (...ids: string[]) => new Set(ids);
const NO_IDS: ReadonlySet<string> = new Set();

describe("method kinds", () => {
  test("a kind offers its named accounts, then its base method", () => {
    expect(methodIdsOfKind(CATALOG, "qris")).toEqual(["2001", "2002", "1003"]);
    expect(methodIdsOfKind(CATALOG, "cash")).toEqual(["1000"]);
  });

  test("`+` lands on the first kind with a free method, in METHODS order", () => {
    expect(nextFreeKind(CATALOG, NO_IDS)).toBe("cash");
    expect(nextFreeKind(CATALOG, taken("1000"))).toBe("qris");
    // The draft's own order does not matter; only `METHODS` order does.
    expect(nextFreeKind(CATALOG, taken("1001"))).toBe("cash");
  });

  test("a kind stays open while it still has an account left", () => {
    // QRIS Mandiri taken: QRIS is not exhausted, so `+` adds another QRIS.
    expect(nextFreeKind(CATALOG, taken("1000", "2001"))).toBe("qris");
    expect(kindExhausted(CATALOG, "qris", taken("2001"))).toBe(false);
    // Base + both accounts taken: now it is.
    expect(kindExhausted(CATALOG, "qris", taken("1003", "2001", "2002"))).toBe(true);
    expect(nextFreeKind(CATALOG, taken("1000", "1003", "2001", "2002"))).toBe("transfer");
  });

  test("the kind's default account is used while it is free, then skipped", () => {
    expect(freeMethodId(CATALOG, "qris", NO_IDS)).toBe("2001");
    // QRIS Mandiri is taken: the new QRIS row is BNI, not Mandiri again.
    expect(freeMethodId(CATALOG, "qris", taken("2001"))).toBe("2002");
    expect(freeMethodId(CATALOG, "qris", taken("2001", "2002"))).toBe("1003");
    // Nothing free at all falls back to the base id rather than throwing.
    expect(freeMethodId(CATALOG, "qris", taken("1003", "2001", "2002"))).toBe("1003");
  });

  test("all methods taken leaves nothing to add", () => {
    expect(
      nextFreeKind(CATALOG, taken("1000", "1003", "1001", "1002", "2001", "2002", "2003")),
    ).toBeNull();
  });
});
