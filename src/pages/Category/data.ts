import { createPageData } from "~/components/page-data";
import type { Category, CategoryError } from "~/services/category";

/**
 * One key: the whole category list. The rows are the only data on the screen —
 * the header, the add button and the dialogs are static — and every row reads the
 * same list, so splitting it would only let the rows disagree with each other.
 */
type CategoryData = { categories: Category[] };

// Cached: every key here is a live stream, so a return visit paints last
// visit's answer (flagged `refetching`) and the first emission confirms it.
export const pageData = createPageData<CategoryData, CategoryError>("CategoryPage", {
  cache: true,
});
