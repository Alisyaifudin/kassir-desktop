import { Stream } from "effect";
import { createPageData } from "~/components/page-data";
import { service } from "~/services";
import type {
  DayProgress,
  ReportCategory,
  ReportDay,
  ReportError,
  ReportTotals,
  PeriodDay,
} from "~/services/report";
import type { PeriodKind } from "~/services/report/period";
import type { RecordError } from "~/services/record";
import type { Info, InfoError } from "~/services/info";

/**
 * The page can fail with either service's tag, because it subscribes to both
 * revisions: a record read can fail just as a report read can. Widening the error
 * type is more honest than flattening one into the other — both carry the one
 * sentence the pane renders (`message`).
 */
export type ReportPageError = ReportError | RecordError | InfoError;

/**
 * The report screen's reads: the day's rail, how much of it is left, and the
 * category list every cell offers.
 *
 * Two independent reads rather than one, so the rail and the counter cannot hold
 * each other up — and so a failure in one leaves the other on screen. Same shape as
 * `/records` (`~/pages/Record/data.ts`), whose rail this one mirrors.
 */
type ReportPageData = {
  /** The day's rail, and whether a day report exists. */
  day: ReportDay;
  /** What is left to classify in the day. */
  progress: DayProgress;
  categories: ReportCategory[];
  /** The chosen period's figures — the report body the PDF is drawn from. */
  totals: ReportTotals;
  /** One row per day of the chosen period, for the `Laporan` rail. */
  days: PeriodDay[];
  /** Whether a report row exists for the chosen period (not just the day). */
  started: boolean;
  /** The shop, for the PDF's masthead. */
  info: Info;
};

// Cached per range (`deps`): returning to a day paints the answer you left, and
// the revision replay re-reads it so an edit elsewhere still lands.
export const pageData = createPageData<ReportPageData, ReportPageError>("ReportPage", {
  cache: true,
});

/**
 * Both revisions, so a write to *either* re-reads.
 *
 * A record edit and a classification bump different counters — the record service
 * owns the first (a sale changes what the report describes) and this one the
 * second (a category changes what it says). Watching one and not the other is a
 * screen that goes stale after half its own writes.
 *
 * The occasional double emission is harmless: `createPageData` keys its cache on
 * `deps`, so the second answer for the same range is the same answer.
 */
function revisions() {
  return Stream.merge(service.report.get.revision, service.record.get.revision);
}

export function reportSources(
  /**
   * The day the rail classifies — always a single day, whatever period the report
   * covers. The classifier works a day at a time, so walking to the next record
   * never leaves the day.
   */
  day: { start: number; end: number },
  /** The range the report covers: the day, a week, a month… */
  range: { start: number; end: number },
  kind: PeriodKind,
) {
  const revs = revisions();
  return {
    day: revs.pipe(Stream.mapEffect(() => service.report.get.day(day.start, day.end))),
    progress: revs.pipe(Stream.mapEffect(() => service.report.get.progress(day.start, day.end))),
    totals: revs.pipe(Stream.mapEffect(() => service.report.get.totals(range.start, range.end))),
    days: revs.pipe(Stream.mapEffect(() => service.report.get.days(range.start, range.end))),
    started: revs.pipe(
      Stream.mapEffect(() => service.report.get.exists(kind, range.start)),
    ),
    info: service.info.info(),
    // The categories, the day and the progress above still read the day; only
    // `totals`, `days` and `started` scope to the period.
    //
    // `categories` is on the revision too, and that is load-bearing: adding one
    // from a cell bumps the revision, and a list read once at mount would hand
    // every picker a set of options that does not contain the category the
    // operator just made — which the combobox then renders as its raw id. Seven
    // rows per write is nothing.
    categories: revs.pipe(Stream.mapEffect(() => service.report.get.categories())),
  };
}

/**
 * "Buat laporan" — the one write the shell itself performs.
 *
 * A mutation source rather than a call site, so the button that fires it is the
 * only place that knows about pending and failure (`useMutation`, as every other
 * form in the app does).
 */
export function startDay(start: number, end: number) {
  return service.report.set.startDay(start, end);
}
