import { createPageData } from "~/components/page-data";
import type { RecordFull, RecordError } from "~/services/record";
import { recordSource } from "../Item/data";

/**
 * The preview pane's own registry — one key, the selected record.
 *
 * It reads the *same* source as `/records/:id` (`../Item/data`'s `recordSource`),
 * so the two faces of one record cannot disagree, and it includes the service's
 * revision counter, so an edit elsewhere re-reads the pane too.
 */
export type DetailData = { record: RecordFull | null };

export const pageData = createPageData<DetailData, RecordError>("RecordDetailPane");

export function detailSources(recordId: string) {
  return { record: recordSource(recordId) };
}
