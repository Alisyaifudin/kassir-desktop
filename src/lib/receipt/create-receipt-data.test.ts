import { describe, expect, test } from "bun:test";
import type { Info } from "~/services/info";
import type { Record, RecordListing } from "~/services/record";
import type { Social } from "~/services/social";
import { createReceiptData } from "./create-receipt-data";
import type { TextData } from "./type";

const info: Info = {
  name: "Kassir",
  owner: "Toko Contoh",
  address: "Jl. Contoh 1",
  footer: "Terima kasih",
  header: "Struk",
  showCashier: false,
};

const socials: Social[] = [
  { id: "s1", name: "WA", value: "0812", updatedAt: 1, syncAt: null },
];

const product: RecordListing = {
  id: "l1",
  productId: "p1",
  name: "Kopi",
  kind: "product",
  unit: 1,
  price: 100_500,
  qty: 1,
  capital: 80_000,
  total: 100_500,
  discounts: [],
  portions: [],
};

function record(overrides: Partial<Record> = {}): Record {
  return {
    id: "01-record",
    createdAt: 1_700_000_000_000,
    date: 1_700_000_000_000,
    paidAt: 1_700_000_000_000,
    creditAt: null,
    rounding: 0,
    isCredit: false,
    cashier: "siti",
    mode: "incoming",
    pay: 100_500,
    note: "",
    fix: 0,
    customer: { name: "", phone: "" },
    supplier: { id: null, name: "" },
    subTotal: 100_500,
    total: 100_500,
    grandTotal: 100_500,
    change: 0,
    methods: [],
    updatedAt: 1_700_000_000_000,
    syncAt: null,
    deletedAt: null,
    ...overrides,
  };
}

/** Every printed line, flattened — what a text-only printer would receive. */
function flatten(rows: TextData[]): string {
  return rows.map((row) => ("text" in row ? [row.text].flat().join(" ") : "")).join("\n");
}

function sectionOrder(rows: TextData[]): string[] {
  return rows.flatMap((row) =>
    row.kind === "spacebetween" ? [`${row.text[0]}=${row.text[1]}`] : [],
  );
}

describe("createReceiptData", () => {
  test("prints a negative rounding line, so the paper explains the money taken", () => {
    const text = flatten(
      createReceiptData(
        {
          info,
          socials,
          products: [product],
          extras: [],
          record: record({ rounding: -500, grandTotal: 100_000, pay: 100_000 }),
        },
        32,
      ),
    );

    expect(text).toContain("-Rp500");
    expect(text).toContain("Total Semua Rp100.000");
  });

  test("lays the money lines out in the order the cashier reads them", () => {
    const rows = createReceiptData(
      {
        info,
        socials,
        products: [product],
        extras: [{ id: "e1", name: "Diskon", value: 500, eff: -500, kind: "number" }],
        record: record({
          total: 100_000,
          rounding: -500,
          grandTotal: 99_500,
          pay: 100_000,
          change: 500,
          methods: [
            { id: "01-method", methodId: "cash", pay: 100_000, name: null, kind: "cash" },
          ],
        }),
      },
      32,
    );

    expect(sectionOrder(rows)).toEqual([
      "100.500 x 1=100.500",
      "Diskon=-Rp500",
      "Total=Rp100.000",
      "Pembulatan=-Rp500",
      "Total Semua=Rp99.500",
      "Pembayaran=Rp100.000",
      "Kembalian=Rp500",
      "1 Jenis/1 pcs=Tunai",
    ]);
  });

  test("carries the footer and socials, and never prints an undefined money line", () => {
    const text = flatten(
      createReceiptData(
        { info, socials, products: [product], extras: [], record: record() },
        32,
      ),
    );

    expect(text).toContain("Terima kasih");
    expect(text).toContain("WA: 0812");
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("NaN");
  });
});
