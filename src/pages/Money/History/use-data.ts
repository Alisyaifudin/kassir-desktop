import { Effect, Stream } from "effect";
import { useQuery, useStream, type Result } from "~/components/Loader";
import { service } from "~/services";
import type { MoneyError } from "~/services/money";
import { useRange } from "../use-range";
import { withDiff, type MoneyRow } from "./with-diff";

export type { MoneyRow } from "./with-diff";

/**
 * The service's write counter, so a queried history re-reads after a record is
 * added or removed. Seeded at 0 so the first render already has a stable key.
 */
function useRevision(): number {
  const res = useStream(service.money.entries.get.revision, () => 0);
  return res.type === "success" ? res.data : 0;
}

/** A pocket's entries in the selected range, newest first, each with its diff. */
export function useData(pocketId: string): Result<MoneyRow[], MoneyError> {
  const { start, endExclusive } = useRange();
  const revision = useRevision();

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
