import { Stream } from "effect";
import { createPageData } from "~/components/page-data";
import { recordSource } from "~/pages/Record/Item/data";
import { service } from "~/services";
import type { LineClassification, ReportError } from "~/services/report";
import type { RecordFull } from "~/services/record";
import type { ReportPageError } from "../data";

/**
 * The selected record, and the categories its lines already carry.
 *
 * Two keys and not one because they come from different services and fail
 * differently: `record` is the record aggregate (`services/record`), `lines` is
 * the classification (`services/report`). Both watch both revisions — a record
 * edit changes what the pane describes, a category change changes what it says,
 * and the screen has to follow either without being told.
 *
 * `record` is the *same* source `/records/:id` reads (`pages/Record/Item/data`),
 * so the classifier and the record page cannot disagree about what a line is
 * called or what it costs.
 */
type ReportDetailData = {
  record: RecordFull | null;
  lines: LineClassification[];
};

// Cached: wandering the rail and coming back paints the pane you left, and the
// revision replay re-reads it.
export const pageData = createPageData<ReportDetailData, ReportPageError>("ReportDetailPane", {
  cache: true,
});

export function detailSources(recordId: string) {
  const revs = Stream.merge(service.report.get.revision, service.record.get.revision);
  return {
    record: recordSource(recordId),
    lines: revs.pipe(Stream.mapEffect(() => service.report.get.lines(recordId))),
  };
}

/** The category list, as the cells need it. Never null — an empty list is a list. */
export type Categories = readonly { id: string; name: string }[];

export type { ReportError };
