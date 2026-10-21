import { Stream } from "effect";
import { useSearchParams } from "react-router";
import { useQuery, type Result } from "~/components/Loader";
import { useRecordRevision } from "~/hooks/use-record-revision";
import { service } from "~/services";
import type { Record as RecordModel, RecordError } from "~/services/record";
import { useTime } from "./use-time";

/**
 * One local day of records, narrowed by the header's `query` param. The name
 * match runs in SQL (`record_listings.record_listing_name`) rather than over
 * every record's lines, so typing re-queries instead of re-filtering in memory.
 */
export function useRecords(): Result<RecordModel[], RecordError> {
  const [search] = useSearchParams();
  const [day] = useTime();
  const query = search.get("query") ?? "";
  const revision = useRecordRevision();

  return useQuery(
    () => Stream.fromEffect(service.record.get.byRange(day.start, day.end, query)),
    [day.start, day.end, query, revision],
    { keepPrevious: true },
  );
}
