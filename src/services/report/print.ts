import { formatDate, formatTime } from "~/lib/date";
import type { Info } from "~/services/info";
import type { PeriodKind } from "./period";
import type { ReportTotals } from ".";

/**
 * The shape `src-tauri/src/report` deserialises — the frontend's half of the
 * paper.
 *
 * Declared here rather than generated: the Rust side only declares the fields it
 * draws (`ReportData` in `report/mod.rs`), and serde ignores anything extra, so
 * this type may keep growing while the paper stays the same size.
 *
 * The *figures* are `ReportTotals`, derived on every read. Nothing here is stored;
 * this is a rendering of what the database said a moment ago.
 */
export type ReportData = {
  period: string;
  range: string;
  shop: string;
  address: string;
  printedAt: number;
  fix: number;
  rows: {
    category: string;
    direction: string;
    lines: number;
    total: number;
  }[];
  incoming: number;
  outcoming: number;
  rounding: number;
  lines: number;
  unclassified: number;
  stale: number;
  /**
   * Lines the operator left out of the report. The PDF prints them as their own
   * section: a total that quietly skips lines is a total nobody can audit.
   */
  excluded: { name: string; at: string; direction: string; total: number }[];
  /** A memo: already deducted from every total, printed so it is not invisible. */
  discounts: { direction: string; entries: number; total: number }[];
  days: {
    label: string;
    records: number;
    unclassified: number;
    stale: number;
  }[];
};

/** What each kind is called on paper. */
const PERIOD_LABEL: Record<PeriodKind, string> = {
  day: "Harian",
  week: "Mingguan",
  month: "Bulanan",
  quarter: "Kuartalan",
  year: "Tahunan",
};

/** `14-03-2026` — the `Per hari` table's date column, in the shop's zone. */
function shortDay(epoch: number): string {
  return formatDate(epoch, "short");
}

/**
 * `14-03-2026 12:34` — when the record happened.
 *
 * An excluded line is something the reader will want to find again, and a name
 * alone does not find it on a day with 150 records. The epoch is formatted here
 * rather than in Rust so both documents read the clock in the shop's zone
 * (`lib/date`), which the Rust side would have to be told separately.
 */
function atLabel(epoch: number): string {
  // `formatTime` does not pad the hour — the receipt prints `9:05`, which reads
  // fine on a slip. A table column does not: `2:40` beside `12:34` breaks the
  // alignment that makes a list of times scannable.
  const time = formatTime(epoch, "short").padStart(5, "0");
  return `${formatDate(epoch, "short")} ${time}`;
}

/**
 * Build the model the PDF is drawn from.
 *
 * `periodLabel` and `rangeLabel` come from `period.ts`, so the paper's heading and
 * the screen's header cannot disagree about which range it is. `days` is passed in
 * already labelled by the same function that builds the rail.
 */
export function toReportData(input: {
  kind: PeriodKind;
  rangeLabel: string;
  totals: ReportTotals;
  days: { day: number; records: number; unclassified: number; stale: number }[];
  info: Info;
  /** The record precision the money is printed with. Reports are whole rupiah. */
  fix?: number;
}): ReportData {
  return {
    period: PERIOD_LABEL[input.kind],
    range: input.rangeLabel,
    shop: input.info.owner === "" ? input.info.name : input.info.owner,
    address: input.info.address,
    printedAt: Date.now(),
    fix: input.fix ?? 0,
    rows: input.totals.categories.map((row) => ({
      category: row.categoryName,
      direction: row.mode === "incoming" ? "Masuk" : "Keluar",
      lines: row.lines,
      total: row.total,
    })),
    incoming: input.totals.incoming,
    outcoming: input.totals.outcoming,
    rounding: input.totals.rounding,
    lines: input.totals.lines,
    unclassified: input.totals.unclassified,
    stale: input.totals.stale,
    discounts: input.totals.discounts.map((row) => ({
      direction: row.mode === "incoming" ? "Masuk" : "Keluar",
      entries: row.entries,
      total: row.total,
    })),
    excluded: input.totals.excluded.map((row) => ({
      name: row.name,
      at: atLabel(row.at),
      direction: row.mode === "incoming" ? "Masuk" : "Keluar",
      total: row.total,
    })),
    // A single day's report gets no `Per hari` table: it would be a table of one,
    // saying nothing the heading has not.
    days:
      input.kind === "day"
        ? []
        : input.days.map((row) => ({
            label: shortDay(row.day),
            records: row.records,
            unclassified: row.unclassified,
            stale: row.stale,
          })),
  };
}

/** The JSON download: the model plus the range it describes, readable by hand. */
export function toReportJson(data: ReportData) {
  return {
    period: data.period,
    range: data.range,
    printedAt: new Date(data.printedAt).toISOString(),
    incoming: data.incoming,
    outcoming: data.outcoming,
    net: data.incoming - data.outcoming,
    rounding: data.rounding,
    lines: data.lines,
    unclassified: data.unclassified,
    stale: data.stale,
    categories: data.rows,
    excluded: data.excluded,
    discounts: data.discounts,
    days: data.days,
  };
}
