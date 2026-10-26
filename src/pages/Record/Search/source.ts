import { Stream } from "effect";
import { service } from "~/services";
import type { ListingHistoryPage, RecordError, RecordMode } from "~/services/record";

type SearchParams = {
  start: number;
  end: number;
  mode: RecordMode;
  query: string;
  limit: number;
};

/**
 * Listing lines matching the query, for one mode inside the range, capped at
 * `limit`. The cap lives in the query rather than in a client-side slice: a single
 * letter over a month matches thousands of lines, and pulling them all across the
 * IPC to render a hundred is the difference between instant and not.
 *
 * The record service's revision counter is inside the source, so a settle or a
 * delete re-reads this page without `deps` having to carry it.
 */
export function resultsSource({
  start,
  end,
  mode,
  query,
  limit,
}: SearchParams): Stream.Stream<ListingHistoryPage, RecordError> {
  return service.record.get.revision.pipe(
    Stream.mapEffect(() => service.record.get.listingHistory({ start, end, mode, query, limit })),
  );
}
