import { createPageData } from "~/components/page-data";
import type { Product, ProductError } from "~/services/product";

/**
 * The catalog list. One key: every control on the screen (search, filter, sort,
 * pagination, the add button) is static, and the two things it feeds — the rows
 * and the counts — come from the same live list, so splitting it would only make
 * the count and the rows disagree for a frame.
 */
export type ProductData = { products: Product[] };

// Cached: every key here is a live stream, so a return visit paints last
// visit's answer (flagged `refetching`) and the first emission confirms it.
export const pageData = createPageData<ProductData, ProductError>("ProductPage", {
  cache: true,
});
