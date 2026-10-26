import { Stream } from "effect";
import { createPageData } from "~/components/page-data";
import { service } from "~/services";
import type { Record as RecordModel, RecordError } from "~/services/record";

/**
 * One local day of records, narrowed by the header's `query` param (the name
 * match runs in SQL, so typing re-queries instead of re-filtering in memory).
 *
 * The day and the query are dependencies, not keys: when they change the previous
 * day stays on screen, flagged `refetching`, until the new one arrives — which is
 * what the header's `busy` state is built on.
 */
type RecordsData = { records: RecordModel[] };

// Cached per day and query (`deps`): the day list comes back instantly, and the
// revision replay re-reads it so an edit elsewhere still lands.
export const pageData = createPageData<RecordsData, RecordError>("RecordsPage", {
  cache: true,
});

/** Live on the record revision, so a commit re-reads the day it belongs to. */
export function recordsSource(
  start: number,
  end: number,
  query: string,
): Stream.Stream<RecordModel[], RecordError> {
  return service.record.get.revision.pipe(
    Stream.mapEffect(() => service.record.get.byRange(start, end, query)),
  );
}
