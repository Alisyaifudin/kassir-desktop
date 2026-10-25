import { Stream } from "effect";
import { createPageData } from "~/components/page-data";
import { service } from "~/services";
import type { DebtRecord, RecordError } from "~/services/record";

export type DebtData = { records: DebtRecord[] };

export const pageData = createPageData<DebtData, RecordError>("DebtPage");

/**
 * Unsettled credit records, newest first.
 *
 * Settling, deleting or re-crediting a record moves it in or out of this list, so
 * the source re-reads on the record service's revision counter — the counter
 * replays its current value on subscribe, so the first emission is also the first
 * read.
 */
export function debtSource(): Stream.Stream<DebtRecord[], RecordError> {
  return service.record.get.revision.pipe(
    Stream.mapEffect(() => service.record.get.debt()),
  );
}
