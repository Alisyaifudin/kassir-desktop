import { Stream } from "effect";
import { useQuery, type Result } from "~/components/Loader";
import { service } from "~/services";
import type { ListingHistoryPage, RecordError } from "~/services/record";
import { useMode } from "../use-mode";
import { useQuery as useUrlQuery } from "../use-query";
import { useRecordRevision } from "../use-records";
import { useRange } from "./use-range";

/**
 * Listing lines matching the query, for one mode inside the range, capped at
 * `limit`. The cap lives in the query rather than in a client-side slice: a
 * single letter over a month matches thousands of lines, and pulling them all
 * across the IPC to render a hundred is the difference between instant and not.
 */
export function useData(limit: number): Result<ListingHistoryPage, RecordError> {
  const { start, endExclusive } = useRange();
  const [mode] = useMode();
  const [query] = useUrlQuery();
  const revision = useRecordRevision();

  return useQuery(
    () =>
      Stream.fromEffect(
        service.record.get.listingHistory({ start, end: endExclusive, mode, query, limit }),
      ),
    [start, endExclusive, mode, query, limit, revision],
    // Typing a query shouldn't blank the results between keystrokes.
    { keepPrevious: true },
  );
}
