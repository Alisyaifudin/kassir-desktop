import { createPageData } from "~/components/page-data";
import type { ListingHistoryPage, RecordError } from "~/services/record";

/** One key: the current page of listing lines that match the search. */
type SearchData = { results: ListingHistoryPage };

// Cached per range, mode, query and page size (`deps`): a search you already ran
// paints its results back, and the revision replay re-reads them.
export const pageData = createPageData<SearchData, RecordError>("RecordSearchPage", {
  cache: true,
});
