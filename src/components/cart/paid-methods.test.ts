import { describe, expect, test } from "bun:test";
import { paidMethods } from "./paid-methods";
import type { Method } from "~/services/method";
import type { DraftMethod } from "~/services/transaction";

/**
 * The "what was tendered" rows on the completion dialog. The strip draws a row
 * for every method of a kind whether or not it was used, so the draft is full of
 * zeros: only rows with money are payments, and a method deleted since the draft
 * named it keeps its money and its row.
 */
const catalog: Method[] = [
  { id: "1000", name: null, kind: "cash", deletedAt: null },
  { id: "2001", name: "BCA", kind: "transfer", deletedAt: null },
  { id: "2002", name: "Mandiri", kind: "transfer", deletedAt: null },
];

const row = (id: string, methodId: string, value: number): DraftMethod => ({
  id,
  methodId,
  value,
});

describe("paidMethods", () => {
  test("an untouched method is not a payment", () => {
    const rows = paidMethods(
      [row("r1", "1000", 50_000), row("r2", "2001", 0), row("r3", "2002", 0)],
      catalog,
    );

    expect(rows).toEqual([{ id: "r1", name: "Tunai", value: 50_000 }]);
  });

  test("a base method is labelled from its kind", () => {
    expect(paidMethods([row("r1", "1000", 10_000)], catalog)[0].name).toBe("Tunai");
  });

  test("a named account keeps its own name", () => {
    expect(paidMethods([row("r1", "2001", 10_000)], catalog)[0].name).toBe("BCA");
  });

  test("a method deleted after the draft named it keeps its money and a label", () => {
    // The catalog no longer carries it; the row must not vanish with its money.
    const rows = paidMethods([row("r1", "gone", 25_000)], catalog);
    expect(rows).toEqual([{ id: "r1", name: "Metode", value: 25_000 }]);
  });

  test("the draft's order and every value are kept", () => {
    const rows = paidMethods(
      [row("r1", "2002", 5_000), row("r2", "1000", 7_000)],
      catalog,
    );

    expect(rows.map((paid) => paid.value)).toEqual([5_000, 7_000]);
    expect(rows.map((paid) => paid.name)).toEqual(["Mandiri", "Tunai"]);
  });
});
