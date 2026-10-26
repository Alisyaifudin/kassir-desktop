import { Effect, Stream } from "effect";
import { createPageData } from "~/components/page-data";
import { service } from "~/services";
import type { Info, InfoError } from "~/services/info";
import type { RecordError, RecordFull } from "~/services/record";
import type { Social, SocialError } from "~/services/social";

/**
 * One record and the two small reads its receipt needs.
 *
 * `record` is a live source rather than a one-shot: every commit, edit, delete or
 * credit bumps the record service's revision, and this page must show the record
 * it is currently describing (an edit re-reads itself).
 */
type RecordItemData = {
  record: RecordFull | null;
  info: Info;
  socials: Social[];
};

// Cached: every key here is a live stream, so a return visit paints last
// visit's answer (flagged `refetching`) and the first emission confirms it.
export const pageData = createPageData<
  RecordItemData,
  RecordError | InfoError | SocialError
>("RecordItemPage", {
  cache: true,
});

/** The record in full, re-read on every write. `null` = its id is gone. */
export function recordSource(id: string): Stream.Stream<RecordFull | null, RecordError> {
  return service.record.get.revision.pipe(
    Stream.mapEffect(() =>
      service.record
        .get
        .byId(id)
        // A record deleted out from under the selection is a normal gap, not an
        // error: the list drops it in the same beat.
        .pipe(Effect.catchTag("NotFound", () => Effect.succeed(null))),
    ),
  );
}
