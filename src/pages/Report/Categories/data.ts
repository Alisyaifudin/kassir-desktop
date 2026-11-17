import { Stream } from "effect";
import { createPageData } from "~/components/page-data";
import { service } from "~/services";
import type { ReportCategory, ReportError } from "~/services/report";

/**
 * The category list, live on the report service's revision.
 *
 * One key, because the rows are the only data here — the header, the add button
 * and the dialogs are static, and every row reads the same list, so splitting it
 * would only let the rows disagree. The stream is what makes a rename show up in
 * every row at once, and what keeps the classifier's pickers honest: `add` and
 * `rename` both bump the same counter.
 */
type ReportCategoriesData = { categories: ReportCategory[] };

// Cached, like every page registry (`registry-cache.test.ts` enforces the shape
// and the decision): a return visit paints the last list and the stream confirms it.
export const pageData = createPageData<ReportCategoriesData, ReportError>("ReportCategoriesPage", {
  cache: true,
});

export const sources = {
  categories: service.report.get.revision.pipe(
    Stream.mapEffect(() => service.report.get.categories()),
  ),
};
