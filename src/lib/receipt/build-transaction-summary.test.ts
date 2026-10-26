import { describe, expect, test } from "bun:test";
import type { Record, RecordListing, RecordMethod } from "~/services/record";
import { buildTransactionSummary } from "./build-transaction-summary";
import type { TextData } from "./type";

/**
 * The line under the totals: how much left the shop, and how it was paid. A
 * split payment has to list every method, and a named variant ("QRIS BCA") keeps
 * its name — the customer's copy is the only place both are written down.
 */
const product = (qty: number): RecordListing => ({
  id: "l1",
  productId: "p1",
  name: "Kopi",
  kind: "product",
  unit: 1,
  price: 1_000,
  qty,
  capital: 800,
  total: 1_000 * qty,
  discounts: [],
  portions: [],
});

const method = (kind: RecordMethod["kind"], name: string | null, pay = 0): RecordMethod => ({
  id: `${kind}-${name ?? "base"}`,
  methodId: "m",
  pay,
  name,
  kind,
});

const record = (methods: RecordMethod[]): Record => ({
  id: "01-record",
  createdAt: 1_700_000_000_000,
  date: 1_700_000_000_000,
  paidAt: 1_700_000_000_000,
  creditAt: null,
  rounding: 0,
  isCredit: false,
  cashier: "siti",
  mode: "incoming",
  pay: 0,
  note: "",
  fix: 0,
  customer: { name: "", phone: "" },
  supplier: { id: null, name: "" },
  subTotal: 0,
  total: 0,
  grandTotal: 0,
  change: 0,
  methods,
  updatedAt: 1_700_000_000_000,
  syncAt: null,
  deletedAt: null,
  pairId: null,
});

/** The row is always a `spacebetween`; the union makes the test say so. */
function textOf(row: TextData): [string, string] {
  if (row.kind !== "spacebetween") throw new Error(`expected a spacebetween row, got ${row.kind}`);
  return row.text;
}

describe("buildTransactionSummary", () => {
  test("counts the species and the pieces", () => {
    const row = buildTransactionSummary([product(1), product(3)], record([]));

    expect(row).toEqual({
      kind: "spacebetween",
      size: "normal",
      text: ["2 Jenis/4 pcs", ""],
    });
  });

  test("an extras-only record has no goods to count", () => {
    expect(textOf(buildTransactionSummary([], record([])))[0]).toBe("0 Jenis/0 pcs");
  });

  test("names the kind of every payment in a split", () => {
    const row = buildTransactionSummary(
      [product(1)],
      record([method("cash", null), method("debit", "BCA")]),
    );

    // The base kind has no name, so only the variant is parenthesised.
    expect(textOf(row)[1]).toBe("Tunai, Debit (BCA)");
  });

  test("a single payment prints just its kind", () => {
    expect(textOf(buildTransactionSummary([product(1)], record([method("qris", null)])))[1]).toBe(
      "QRIS",
    );
  });
});
