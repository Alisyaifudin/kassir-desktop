import { describe, expect, test } from "bun:test";
import type { Record, RecordExtra } from "~/services/record";
import { buildSummarySection } from "./build-summary";

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
    pay: 0,
    note: "",
    fix: 0,
    customer: { name: "", phone: "" },
    supplier: { id: null, name: "" },
    subTotal: 0,
    total: 0,
    grandTotal: 0,
    change: 0,
    methods: [],
    updatedAt: 1_700_000_000_000,
    syncAt: null,
    deletedAt: null,
    ...overrides,
  };
}

/** The `[label, value]` pairs of every `spacebetween` row, in print order. */
function pairsOf(rows: ReturnType<typeof buildSummarySection>): [string, string][] {
  return rows.flatMap((row) =>
    row.kind === "spacebetween" ? [[row.text[0], row.text[1]] as [string, string]] : [],
  );
}

function labelsOf(rows: ReturnType<typeof buildSummarySection>): string[] {
  return pairsOf(rows).map(([label]) => label);
}

function valueOf(rows: ReturnType<typeof buildSummarySection>, label: string): string | undefined {
  return pairsOf(rows).find(([rowLabel]) => rowLabel === label)?.[1];
}

const discount: RecordExtra = {
  id: "e1",
  name: "Diskon",
  value: 5_000,
  eff: -5_000,
  kind: "number",
};

describe("buildSummarySection", () => {
  test("with no rounding prints one Total and no Pembulatan row", () => {
    const rows = buildSummarySection(
      record({ subTotal: 100_000, total: 100_000, grandTotal: 100_000, pay: 100_000 }),
      [],
      32,
    );

    expect(labelsOf(rows)).toEqual(["Total", "Pembayaran"]);
    expect(valueOf(rows, "Total")).toBe("Rp100.000");
  });

  test("rounds up: Pembulatan and Total Semua sit between Total and Pembayaran", () => {
    const rows = buildSummarySection(
      record({
        subTotal: 100_500,
        total: 100_500,
        rounding: 500,
        grandTotal: 101_000,
        pay: 101_000,
      }),
      [],
      32,
    );

    expect(labelsOf(rows)).toEqual(["Total", "Pembulatan", "Total Semua", "Pembayaran"]);
    expect(valueOf(rows, "Pembulatan")).toBe("Rp500");
    expect(valueOf(rows, "Total Semua")).toBe("Rp101.000");
  });

  test("rounds down: a negative Pembulatan is printed, and the grand total too", () => {
    // A Rp100.500 sale rounded down to Rp100.000 used to print only
    // `Total Rp100.500` / `Pembayaran Rp100.000`, i.e. paper that does not
    // explain the Rp500 and no line showing what was actually owed.
    const rows = buildSummarySection(
      record({
        subTotal: 100_500,
        total: 100_500,
        rounding: -500,
        grandTotal: 100_000,
        pay: 100_000,
      }),
      [],
      32,
    );

    expect(labelsOf(rows)).toEqual(["Total", "Pembulatan", "Total Semua", "Pembayaran"]);
    expect(valueOf(rows, "Pembulatan")).toBe("-Rp500");
    expect(valueOf(rows, "Total Semua")).toBe("Rp100.000");
  });

  test("prints the subtotal, the discount and the total after extras, then the grand total", () => {
    const rows = buildSummarySection(
      record({
        subTotal: 100_000,
        total: 95_000,
        rounding: -500,
        grandTotal: 94_500,
        pay: 100_000,
        change: 5_500,
      }),
      [discount],
      32,
    );

    expect(labelsOf(rows)).toEqual([
      "Diskon",
      "Total",
      "Pembulatan",
      "Total Semua",
      "Pembayaran",
      "Kembalian",
    ]);
    expect(valueOf(rows, "Diskon")).toBe("-Rp5.000");
    expect(valueOf(rows, "Total")).toBe("Rp95.000");
    expect(valueOf(rows, "Pembulatan")).toBe("-Rp500");
    expect(valueOf(rows, "Total Semua")).toBe("Rp94.500");
    expect(valueOf(rows, "Kembalian")).toBe("Rp5.500");
  });
});
