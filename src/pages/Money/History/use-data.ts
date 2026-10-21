import { Effect, Stream } from "effect";
import { useQuery, type Result } from "~/components/Loader";
import { useMoneyRevision } from "~/hooks/use-money-revision";
import { service } from "~/services";
import type { MoneyError } from "~/services/money";
import { useRange } from "../use-range";
import { withDiff, type MoneyRow } from "./with-diff";

export type { MoneyRow } from "./with-diff";

/** A pocket's entries in the selected range, newest first, each with its diff. */
export function useData(pocketId: string): Result<MoneyRow[], MoneyError> {
  const { start, endExclusive } = useRange();
  // Shared write counter: the history re-reads after an entry is added/removed.
  const revision = useMoneyRevision();

  return useQuery(
    () => Stream.fromEffect(program(pocketId, start, endExclusive)),
    [pocketId, start, endExclusive, revision],
    { keepPrevious: true },
  );
}

function program(pocketId: string, start: number, end: number) {
  return Effect.gen(function* () {
    // `previous` is the balance the oldest row in range is measured against; it
    // lives outside the range, so it is its own read.
    const [entries, previous] = yield* Effect.all([
      service.money.entries.get.byRange(pocketId, start, end),
      service.money.entries.get.last(pocketId, start),
    ]);
    return withDiff(entries, previous);
  });
}
