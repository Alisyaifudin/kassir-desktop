import { Effect, Stream } from "effect";
import { useMemo } from "react";
import { Temporal } from "temporal-polyfill";
import { useQuery, type Result } from "~/components/Loader";
import { useDayStart } from "~/hooks/use-day-start";
import { useRecordRevision } from "~/hooks/use-record-revision";
import { tz } from "~/lib/constants";
import { service } from "~/services";
import type { RecordError, RecordMode, RecordSummary } from "~/services/record";

export type Stats = {
  today: Record<RecordMode, RecordSummary>;
  yesterday: Record<RecordMode, RecordSummary>;
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

export function useStats(): Result<Stats, RecordError> {
  // "Today" rolls over on its own: a shop PC left open across local midnight
  // used to keep showing yesterday's takings as "Pendapatan Hari Ini".
  const dayStart = useDayStart();
  const range = useMemo(() => dayRanges(dayStart), [dayStart]);
  // And a commit made while Beranda is mounted refreshes the numbers, like every
  // other day-scoped screen.
  const revision = useRecordRevision();

  return useQuery(
    () =>
      Stream.fromEffect(
        Effect.gen(function* () {
          const [today, yesterday] = yield* Effect.all([
            service.record.count.summary(range.today.start, range.today.end),
            service.record.count.summary(range.yesterday.start, range.yesterday.end),
          ]);
          return { today: byMode(today), yesterday: byMode(yesterday) };
        }),
      ),
    [range.today.start, revision],
    { keepPrevious: true },
  );
}
