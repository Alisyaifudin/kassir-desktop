import { createPageData } from "~/components/page-data";
import type { ListingHistoryPage, RecordError } from "~/services/record";

/** One key: the current page of listing lines that match the search. */
export type SearchData = { results: ListingHistoryPage };

export const pageData = createPageData<SearchData, RecordError>("RecordSearchPage");
