import { describe, expect, test } from "bun:test";
import type { RecordFull } from "~/services/record";
import { toRecordImport } from "./util-record-export";

/**
 * The download half of the round trip.
 *
 * The upload restores the stock journal from `listings[].portions[].event`, so
 * the export has to put it there: the per-lot split (not the regrouped line), the
 * event's own id and time, and the product/lot it moved. These pin the mapping
 * the service read (`get.byId`) feeds, which is the part no integration test
 * covers.
 */
function record(overrides: Partial<RecordFull> = {}): RecordFull {
  return {
    id: "r1",
    createdAt: 100,
    date: 200,
    paidAt: 200,
    creditAt: null,
    rounding: 0,
    isCredit: false,
    cashier: "Raisya",
    mode: "incoming",
    pay: 30_000,
    note: "",
    fix: 0,
    customer: { name: "Budi", phone: "0812" },
    supplier: { id: null, name: "" },
    subTotal: 30_000,
    total: 30_000,
    grandTotal: 30_000,
    change: 0,
    methods: [{ id: "m1", methodId: "cash", pay: 30_000, name: "Tunai", kind: "cash" }],
    updatedAt: 200,
    syncAt: null,
    deletedAt: null,
    pairId: null,
    listings: [
      {
        id: "g1",
        productId: "p1",
        name: "Kopi",
        kind: "retail",
        unit: 1,
        price: 10_000,
        qty: 3,
        capital: 5_000,
        total: 30_000,
        discounts: [{ id: "d1", kind: "number", value: 1_000, eff: 1_000 }],
        portions: [
          {
            id: "l1",
            productEventId: "e1",
            stockId: "s1",
            productId: "p1",
            unit: 1,
            qty: 2,
            capital: 4_000,
            total: 20_000,
            event: { id: "e1", createdAt: 200, value: -2, capital: 4_000, note: "" },
          },
          {
            id: "l2",
            productEventId: "e2",
            stockId: "s2",
            productId: "p1",
            unit: 1,
            qty: 1,
            capital: 6_000,
            total: 10_000,
            event: { id: "e2", createdAt: 200, value: -1, capital: 6_000, note: "" },
          },
        ],
      },
    ],
    extras: [{ id: "x1", name: "Ongkir", value: 2_000, eff: 2_000, kind: "number", flag: 0 }],
    ...overrides,
  };
}

describe("record export", () => {
  test("a sold line carries its lots and the journal rows behind them", () => {
    const exported = toRecordImport(record());
    const line = exported.listings[0]!;

    // The catalog link was dropped when the line stopped storing one: what an
    // import restores is the movement, not the listing.
    expect(line.listingId).toBeNull();
    expect(line.portions).toEqual([
      {
        unit: 1,
        qty: 2,
        capital: 4_000,
        total: 20_000,
        event: {
          id: "e1",
          createdAt: 200,
          value: -2,
          capital: 4_000,
          note: "",
          productId: "p1",
          stockId: "s1",
        },
      },
      {
        unit: 1,
        qty: 1,
        capital: 6_000,
        total: 10_000,
        event: {
          id: "e2",
          createdAt: 200,
          value: -1,
          capital: 6_000,
          note: "",
          productId: "p1",
          stockId: "s2",
        },
      },
    ]);

    // The money and the line-level discount travel on the line, as they always did.
    expect(line.total).toBe(30_000);
    expect(line.discounts).toEqual([{ kind: "number", value: 1_000, eff: 1_000 }]);
    expect(exported.methods).toEqual([{ methodId: "cash", pay: 30_000 }]);
    expect(exported.extras).toEqual([{ name: "Ongkir", value: 2_000, eff: 2_000, kind: "number" }]);
  });

  test("a portion that moved no stock exports no event", () => {
    const base = record();
    base.listings[0]!.portions[0]!.event = null;

    const portion = toRecordImport(base).listings[0]!.portions![0]!;

    expect(portion.event).toBeNull();
    // The rest of the portion is still there, so the line keeps its shape.
    expect([portion.unit, portion.qty, portion.capital, portion.total]).toEqual([1, 2, 4_000, 20_000]);
  });

  test("an event with no product link is left out rather than guessed", () => {
    const base = record();
    base.listings[0]!.portions[0]!.productId = null;

    const portion = toRecordImport(base).listings[0]!.portions![0]!;

    expect(portion.event).toBeNull();
  });

  test("a credit exports the date it belongs to, and says it is a credit", () => {
    // Outstanding: nothing paid yet, so the credit date carries the record.
    const outstanding = toRecordImport(
      record({ isCredit: true, paidAt: null, creditAt: 150, date: 150 }),
    );
    expect(outstanding.isCredit).toBe(true);
    expect(outstanding.paidAt).toBe(150);

    // Settled: the day the shop was paid is the date, not the day it was opened.
    const settled = toRecordImport(record({ isCredit: false, paidAt: 300, creditAt: 150, date: 300 }));
    expect(settled.isCredit).toBe(false);
    expect(settled.paidAt).toBe(300);
  });
});
