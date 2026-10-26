import Decimal from "decimal.js";
import { Effect, Stream } from "effect";
import { Temporal } from "temporal-polyfill";
import { tz } from "~/lib/constants";
import { service } from "~/services";
import type {
  DebtRecord,
  RecordError,
  RecordMode,
  RecordSummary,
} from "~/services/record";
/** Both modes are always present — a missing row means "nothing in range". */
export type DaySummaries = Record<RecordMode, RecordSummary>;

/** Outstanding credit across every open record, not only today's. */
export type DebtFacts = { total: number; count: number };

function emptySummary(mode: RecordMode): RecordSummary {
  return { mode, count: 0, total: 0 };
}

function byMode(summaries: RecordSummary[]): DaySummaries {
  return {
    incoming: summaries.find((item) => item.mode === "incoming") ?? emptySummary("incoming"),
    outcoming: summaries.find((item) => item.mode === "outcoming") ?? emptySummary("outcoming"),
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

function debtOf(records: DebtRecord[]): DebtFacts {
  return {
    count: records.length,
    // Decimal, like the day list's footer: a sum of stored totals must not pick
    // up float noise just because it is only for display.
    total: records.length === 0 ? 0 : Decimal.sum(...records.map((item) => item.total)).toNumber(),
  };
}

/**
 * Beranda's day-scoped reads, one source per question the page asks.
 *
 * They used to be a single query, so the band and the ledger could never load at
 * different moments — but they are four unrelated reads (two summaries, a range
 * of records, the outstanding credit), and one of them being slow held up the
 * rest. Each is its own key now: the grid, the ledger and the debt card wait for
 * exactly the read behind them, in parallel.
 *
 * Each source re-runs on the record service's revision counter, so a commit
 * reaches Beranda even while it is mounted. That counter replays its current
 * value on subscribe, so the first emission is also the first read.
 */
export function daySources(dayStart: number) {
  const range = dayRanges(dayStart);

  const onEachCommit = <A>(read: Effect.Effect<A, RecordError>): Stream.Stream<A, RecordError> =>
    service.record.get.revision.pipe(Stream.mapEffect(() => read));

  return {
    today: onEachCommit(
      service.record.count.summary(range.today.start, range.today.end).pipe(Effect.map(byMode)),
    ),
    yesterday: onEachCommit(
      service.record.count.summary(range.yesterday.start, range.yesterday.end).pipe(Effect.map(byMode)),
    ),
    records: onEachCommit(
      service.record
        .get
        .byRange(range.today.start, range.today.end)
        // `byRange` answers oldest-first; the page reads newest-first.
        .pipe(Effect.map((records) => [...records].sort((a, b) => b.date - a.date))),
    ),
    debt: onEachCommit(service.record.get.debt().pipe(Effect.map(debtOf))),
  };
}
