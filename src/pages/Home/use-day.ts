import Decimal from "decimal.js";
import { Effect, Stream } from "effect";
import { useMemo } from "react";
import { Temporal } from "temporal-polyfill";
import { useQuery, type Result } from "~/components/Loader";
import { useDayStart } from "~/hooks/use-day-start";
import { useRecordRevision } from "~/hooks/use-record-revision";
import { tz } from "~/lib/constants";
import { service } from "~/services";
import type {
  DebtRecord,
  Record as RecordModel,
  RecordError,
  RecordMode,
  RecordSummary,
} from "~/services/record";

export type DayFacts = {
  today: Record<RecordMode, RecordSummary>;
  yesterday: Record<RecordMode, RecordSummary>;
  /** Today's settled records, newest first. */
  records: RecordModel[];
  /** Every outstanding credit, not only today's — the same set /debt lists. */
  debt: { total: number; count: number };
};

function empty(mode: RecordMode): RecordSummary {
  return { mode, count: 0, total: 0 };
}

/** Missing rows mean "no records in range", not "not loaded". */
function byMode(summaries: RecordSummary[]): Record<RecordMode, RecordSummary> {
  return {
    incoming: summaries.find((item) => item.mode === "incoming") ?? empty("incoming"),
    outcoming: summaries.find((item) => item.mode === "outcoming") ?? empty("outcoming"),
  };
}

/** Local-midnight boundaries for the day starting at `dayStart`, and the one before. */
function dayRanges(dayStart: number) {
  const start = Temporal.Instant.fromEpochMilliseconds(dayStart).toZonedDateTimeISO(tz);
  return {
    today: { start: start.epochMilliseconds, end: start.add({ days: 1 }).epochMilliseconds },
    yesterday: {
      start: start.subtract({ days: 1 }).epochMilliseconds,
      end: start.epochMilliseconds,
    },
  };
}

function debtOf(records: DebtRecord[]): { total: number; count: number } {
  return {
    count: records.length,
    // Decimal, like the day list's footer: a sum of stored totals must not pick
    // up float noise just because it is only for display.
    total: records.length === 0 ? 0 : Decimal.sum(...records.map((item) => item.total)).toNumber(),
  };
}

/**
 * Everything Beranda says about the day, in one read: the two day summaries, the
 * records behind them and the outstanding credits.
 *
 * One query rather than three so the band and the ledger below it never disagree
 * or load at different moments. "Today" rolls over on its own (a shop PC left
 * open across midnight kept showing yesterday's takings), and a commit made
 * while Beranda is mounted re-reads it, like every other day-scoped screen.
 */
export function useDay(): Result<DayFacts, RecordError> {
  const dayStart = useDayStart();
  const range = useMemo(() => dayRanges(dayStart), [dayStart]);
  const revision = useRecordRevision();

  return useQuery(
    () =>
      Stream.fromEffect(
        Effect.gen(function* () {
          const [today, yesterday, records, debt] = yield* Effect.all([
            service.record.count.summary(range.today.start, range.today.end),
            service.record.count.summary(range.yesterday.start, range.yesterday.end),
            service.record.get.byRange(range.today.start, range.today.end),
            service.record.get.debt(),
          ]);
          return {
            today: byMode(today),
            yesterday: byMode(yesterday),
            // `byRange` answers oldest-first; the page reads newest-first.
            records: [...records].sort((a, b) => b.date - a.date),
            debt: debtOf(debt),
          };
        }),
      ),
    [range.today.start, revision],
    { keepPrevious: true },
  );
}
