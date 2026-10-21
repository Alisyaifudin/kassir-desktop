import { Effect, Stream } from "effect";
import { useQuery, type Result } from "~/components/Loader";
import { service } from "~/services";
import type { RecordError, RecordFull } from "~/services/record";
import { useRecordRevision } from "~/hooks/use-record-revision";

/**
 * The selected record in full. The list only carries headers (plus its
 * payments), so the lines and extras are read on selection instead of shipping
 * every record's children for the whole day.
 *
 * `null` means the id is gone — deleted out from under the selection, which the
 * list drops in the same beat. That is a normal gap, not an error, so it does
 * not reach the boundary.
 */
export function useRecordFull(id: string): Result<RecordFull | null, RecordError> {
  const revision = useRecordRevision();
  return useQuery(
    () =>
      Stream.fromEffect(
        service.record.get.byId(id).pipe(Effect.catchTag("NotFound", () => Effect.succeed(null))),
      ),
    [id, revision],
    { keepPrevious: true },
  );
}
