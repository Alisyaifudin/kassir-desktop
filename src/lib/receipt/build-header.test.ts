import { describe, expect, test } from "bun:test";
import type { Info } from "~/services/info";
import type { Record } from "~/services/record";
import { formatDate } from "~/lib/date";
import { buildHeaderSection } from "./build-header";

const info: Info = {
  name: "Kassir",
  owner: "Toko Contoh",
  address: "Jl. Contoh 1",
  footer: "Terima kasih",
  header: "Struk",
  showCashier: false,
};

function record(overrides: Partial<Record>): Record {
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

/** The concatenated `text` of every header row, for substring assertions. */
function textOf(rows: ReturnType<typeof buildHeaderSection>): string {
  return rows
    .map((row) => ("text" in row ? [row.text].flat().join(" ") : ""))
    .join(" ");
}

describe("buildHeaderSection", () => {
  test("dates a paid record with its settlement date", () => {
    const paidAt = 1_700_000_000_000;
    const text = textOf(buildHeaderSection(info, record({ paidAt })));

    expect(text).toContain(formatDate(paidAt, "short"));
    expect(text).not.toContain("Kredit");
  });

  test("prints a credit record with its credit date instead of crashing", () => {
    // `paidAt` is null for an outstanding credit — the old code fed it straight
    // into `Temporal.Instant.fromEpochMilliseconds`, which threw a defect that
    // every `catchAll` on the print path missed.
    const creditAt = 1_701_000_000_000;
    const rows = buildHeaderSection(
      info,
      record({ paidAt: null, creditAt, isCredit: true, date: creditAt }),
    );

    const text = textOf(rows);
    expect(text).toContain("Kredit");
    expect(text).toContain(formatDate(creditAt, "short"));
  });

  test("falls back to the creation date when both dates are missing", () => {
    const createdAt = 1_700_000_000_000;
    const rows = buildHeaderSection(
      info,
      record({ paidAt: null, creditAt: null, createdAt }),
    );

    expect(textOf(rows)).toContain(formatDate(createdAt, "short"));
  });
});
