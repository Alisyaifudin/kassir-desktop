import { describe, expect, test } from "bun:test";
import type { Info } from "~/services/info";
import type { ReportTotals } from ".";
import { toReportData, toReportJson } from "./print";

/**
 * The frontend's half of the paper: what the PDF is drawn from.
 *
 * Two things worth pinning. The period's *name* comes from `period.ts`'s table and
 * not from the caller, so the paper's heading and the screen's header cannot
 * disagree about which range it is. And a single day's report carries no `Per hari`
 * table — a table of one says nothing the heading has not.
 */
const INFO: Info = {
  name: "Kassir",
  owner: "Toko Contoh",
  address: "Jl. Contoh 1",
  footer: "",
  header: "",
  showCashier: true,
};

function totals(overrides: Partial<ReportTotals> = {}): ReportTotals {
  return {
    incoming: 76_000,
    outcoming: 30_000,
    rounding: 500,
    categories: [
      {
        categoryId: "c1",
        categoryName: "Jual",
        slug: "jual",
        order: 1,
        mode: "incoming",
        lines: 3,
        total: 76_000,
      },
      {
        categoryId: "c2",
        categoryName: "Beli",
        slug: "beli",
        order: 0,
        mode: "outcoming",
        lines: 1,
        total: 30_000,
      },
    ],
    lines: 4,
    unclassified: 0,
    stale: 0,
    excluded: [],
    discounts: [],
    ...overrides,
  };
}

const DAY = { day: 1_770_000_000_000, records: 2, unclassified: 0, stale: 0 };

function build(kind: "day" | "week" | "month" | "quarter" | "year") {
  return toReportData({
    kind,
    rangeLabel: "14 Maret 2026",
    totals: totals(),
    days: [DAY],
    info: INFO,
  });
}

describe("toReportData", () => {
  test("names the period the way the paper's heading does", () => {
    expect(build("day").period).toBe("Harian");
    expect(build("week").period).toBe("Mingguan");
    expect(build("month").period).toBe("Bulanan");
    expect(build("quarter").period).toBe("Kuartalan");
    expect(build("year").period).toBe("Tahunan");
  });

  test("the shop name is the owner's, falling back to the app's own name", () => {
    expect(build("day").shop).toBe("Toko Contoh");

    const unnamed = toReportData({
      kind: "day",
      rangeLabel: "",
      totals: totals(),
      days: [],
      info: { ...INFO, owner: "" },
    });
    expect(unnamed.shop).toBe("Kassir");
  });

  test("each category becomes a row, with its direction spelled out", () => {
    const data = build("day");

    expect(data.rows).toEqual([
      { category: "Jual", direction: "Masuk", lines: 3, total: 76_000 },
      { category: "Beli", direction: "Keluar", lines: 1, total: 30_000 },
    ]);
  });

  test("a single day carries no per-day table, a period does", () => {
    expect(build("day").days).toEqual([]);
    expect(build("week").days).toHaveLength(1);
  });

  test("the work left over travels to the paper", () => {
    const data = toReportData({
      kind: "week",
      rangeLabel: "9–15 Mar 2026",
      totals: totals({ unclassified: 2, stale: 1 }),
      days: [],
      info: INFO,
    });

    expect(data.unclassified).toBe(2);
    expect(data.stale).toBe(1);
  });

  test("the discount memo is carried, per direction", () => {
    // Already deducted from every category total — the paper prints it so "how
    // much did we give away" has an answer, and so it can be read as a memo
    // rather than added to anything.
    const data = toReportData({
      kind: "day",
      rangeLabel: "14 Maret 2026",
      totals: totals({
        discounts: [{ mode: "incoming", entries: 9_196, total: 279_650_342 }],
      }),
      days: [],
      info: INFO,
    });

    expect(data.discounts).toEqual([
      { direction: "Masuk", entries: 9_196, total: 279_650_342 },
    ]);
  });

  test("excluded lines become a section, direction and all", () => {
    // The lines the report deliberately leaves out, so its figures can be read
    // against what they skip.
    const data = toReportData({
      kind: "day",
      rangeLabel: "14 Maret 2026",
      totals: totals({
        excluded: [
          { name: "Ongkir", mode: "incoming", total: 10_000 },
          { name: "Ongkir", mode: "outcoming", total: 10_000 },
        ],
      }),
      days: [],
      info: INFO,
    });

    expect(data.excluded).toEqual([
      { name: "Ongkir", direction: "Masuk", total: 10_000 },
      { name: "Ongkir", direction: "Keluar", total: 10_000 },
    ]);
  });

  test("money is printed in whole rupiah unless told otherwise", () => {
    expect(build("day").fix).toBe(0);
    expect(
      toReportData({
        kind: "day",
        rangeLabel: "",
        totals: totals(),
        days: [],
        info: INFO,
        fix: 2,
      }).fix,
    ).toBe(2);
  });
});

describe("toReportJson", () => {
  test("is readable on its own: the range, the net, and the rows", () => {
    const json = toReportJson(build("day"));

    expect(json).toMatchObject({
      period: "Harian",
      range: "14 Maret 2026",
      incoming: 76_000,
      outcoming: 30_000,
      net: 46_000,
      rounding: 500,
    });
    expect(json.categories).toHaveLength(2);
    // An ISO timestamp, not a bare epoch — this file is meant to be read.
    expect(typeof json.printedAt).toBe("string");
  });
});
