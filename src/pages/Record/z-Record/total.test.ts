/**
 * Behaviour checks for the /records footer total.
 *
 * Run with:  bun test src/pages/Record/z-Record/total.test.ts
 *
 * The footer has to equal the sum of the list's own `Total` column, so these
 * cases are the ones where summing a record naively goes wrong: the change has
 * to come off the tender that produced it, exactly once, and only when the
 * filter kept that tender.
 */
import { describe, expect, test } from "bun:test";
import type { Record as RecordModel } from "~/services/record";
import type { MethodSelection } from "../method-filter";
import { EMPTY_SELECTION, matchesMethod } from "../method-filter";
import { recordsTotal, recordTotal } from "./total";

let seq = 0;
const payment = (methodId: string, kind: string, pay: number, name: string | null = null) => ({
  id: `rm${++seq}`,
  methodId,
  pay,
  name,
  kind,
}) as RecordModel["methods"][number];

function paid(
  methods: RecordModel["methods"],
  overrides: Partial<RecordModel> = {},
): RecordModel {
  return {
    id: `r${++seq}`,
    createdAt: 1_000,
    date: 1_000,
    paidAt: 1_000,
    creditAt: null,
    rounding: 0,
    isCredit: false,
    cashier: "kasir",
    mode: "incoming",
    pay: methods.reduce((sum, method) => sum + method.pay, 0),
    note: "",
    fix: 0,
    customer: { name: "", phone: "" },
    supplier: { id: null, name: "" },
    subTotal: 0,
    total: 0,
    grandTotal: 0,
    change: 0,
    methods,
    updatedAt: 1_000,
    syncAt: null,
    deletedAt: null,
    pairId: null,
    ...overrides,
  };
}

const cashOnly: MethodSelection = { kinds: ["cash"], methods: [] };
const qrisOnly: MethodSelection = { kinds: ["qris"], methods: [] };

describe("the footer total", () => {
  test("cash gives the change back, so the record totals what was due", () => {
    // Tendered 25.000 for a 20.000 sale: 5.000 came back out of the drawer.
    const record = paid([payment("1000", "cash", 25_000)], {
      grandTotal: 20_000,
      change: 5_000,
    });

    expect(recordTotal(record, EMPTY_SELECTION).toNumber()).toBe(20_000);
    expect(recordTotal(record, cashOnly).toNumber()).toBe(20_000);
  });

  test("a split totals its payments, change counted once", () => {
    const record = paid(
      [payment("1000", "cash", 15_000), payment("1005", "qris", 10_000, "BNI")],
      { grandTotal: 20_000, change: 5_000 },
    );

    expect(recordTotal(record, EMPTY_SELECTION).toNumber()).toBe(20_000);
    expect(recordTotal(record, cashOnly).toNumber()).toBe(10_000);
    // The filter hid the tender that handed the change back, so QRIS is shown
    // and summed as what it actually paid.
    expect(recordTotal(record, qrisOnly).toNumber()).toBe(10_000);
  });

  test("a record paid cash in two goes is not docked the change twice", () => {
    const record = paid(
      [payment("1000", "cash", 15_000), payment("1006", "cash", 10_000, "Lain")],
      { grandTotal: 20_000, change: 5_000 },
    );

    expect(recordTotal(record, EMPTY_SELECTION).toNumber()).toBe(20_000);
    expect(recordTotal(record, cashOnly).toNumber()).toBe(20_000);
  });

  test("an over-tendered transfer gives the change back on its only line", () => {
    const record = paid([payment("1005", "qris", 25_000, "BNI")], {
      grandTotal: 20_000,
      change: 5_000,
    });

    // No cash at all, and the QRIS line is the one the list docks.
    expect(recordTotal(record, EMPTY_SELECTION).toNumber()).toBe(20_000);
    expect(recordTotal(record, qrisOnly).toNumber()).toBe(20_000);
  });

  test("an underpaid credit keeps what it paid — nothing is given back", () => {
    const record = paid([payment("1000", "cash", 5_000)], {
      grandTotal: 20_000,
      change: -15_000,
      isCredit: true,
    });

    expect(recordTotal(record, EMPTY_SELECTION).toNumber()).toBe(5_000);
    expect(recordTotal(record, cashOnly).toNumber()).toBe(5_000);
  });

  test("a credit with nothing settled yet falls back to its grand total, as the list does", () => {
    const record = paid([payment("1000", "cash", 0)], {
      grandTotal: 20_000,
      isCredit: true,
    });

    expect(recordTotal(record, EMPTY_SELECTION).toNumber()).toBe(20_000);
  });

  test("no records totals zero, not a crash", () => {
    expect(recordsTotal([], EMPTY_SELECTION)).toBe(0);
  });

  test("the footer is the sum of every record the filter keeps", () => {
    const records = [
      paid([payment("1000", "cash", 25_000)], { grandTotal: 20_000, change: 5_000 }),
      paid([payment("1005", "qris", 10_000, "BNI")], { grandTotal: 10_000 }),
    ];
    // What the page renders: the method filter decides which records are listed,
    // then the footer adds those records' columns up.
    const footer = (selection: MethodSelection) =>
      recordsTotal(
        records.filter((record) => matchesMethod(record, selection)),
        selection,
      );

    expect(footer(EMPTY_SELECTION)).toBe(30_000);
    expect(footer(cashOnly)).toBe(20_000);
    expect(footer(qrisOnly)).toBe(10_000);
  });

  test("fractional prices add up without float dust", () => {
    const records = [
      paid([payment("1000", "cash", 0.1)], { grandTotal: 0.1 }),
      paid([payment("1000", "cash", 0.2)], { grandTotal: 0.2 }),
    ];

    expect(recordsTotal(records, EMPTY_SELECTION)).toBe(0.3);
  });
});
