import { Effect, Stream } from "effect";
import { createPageData } from "~/components/page-data";
import { service } from "~/services";
import type { MoneyError, PocketSummary } from "~/services/money";
import { withDiff, type MoneyRow } from "./with-diff";

/**
 * A pocket's ledger page: the pockets (to resolve the id in the URL) and that
 * pocket's entries in the selected range.
 *
 * Two keys, because they answer different questions: the header only needs the
 * pocket, and the table only needs the rows. The range and the pocket id are
 * dependencies — a new range keeps the old rows on screen, flagged `refetching`,
 * while the table loads behind them.
 */
export type PocketHistoryData = {
  pockets: PocketSummary[];
  entries: MoneyRow[];
};

export const pageData = createPageData<PocketHistoryData, MoneyError>("PocketHistoryPage");

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

/** Live on the money revision: adding or deleting an entry re-reads the range. */
export function entriesSource(
  pocketId: string,
  start: number,
  endExclusive: number,
): Stream.Stream<MoneyRow[], MoneyError> {
  return service.money.entries.get.revision.pipe(
    Stream.mapEffect(() => program(pocketId, start, endExclusive)),
  );
}
