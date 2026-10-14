import { Stream } from "effect";
import { useSearchParams } from "react-router";
import { useQuery, useStream, type Result } from "~/components/Loader";
import { service } from "~/services";
import type { Record as RecordModel, RecordError } from "~/services/record";
import { useTime } from "./use-time";

/**
 * The service's write counter. Every commit and delete bumps it, so a queried
 * page re-reads by putting it in the query's deps. Seeded at 0 so the first
 * render already has a stable key instead of waiting on the stream.
 */
export function useRecordRevision(): number {
  const res = useStream(service.record.get.revision, () => 0);
  return res.type === "success" ? res.data : 0;
}

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
