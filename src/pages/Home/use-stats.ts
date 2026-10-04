import { Effect, Stream } from "effect";
import { useMemo } from "react";
import { Temporal } from "temporal-polyfill";
import { useQuery, type Result } from "~/components/Loader";
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

/** Local-midnight boundaries for today and yesterday. */
function dayRanges() {
  const start = Temporal.Now.zonedDateTimeISO(tz).startOfDay();
  return {
    today: { start: start.epochMilliseconds, end: start.add({ days: 1 }).epochMilliseconds },
    yesterday: {
      start: start.subtract({ days: 1 }).epochMilliseconds,
      end: start.epochMilliseconds,
    },
  };
}

export function useStats(): Result<Stats, RecordError> {
  const range = useMemo(dayRanges, []);

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
    [range.today.start],
  );
}
