import { createPageData } from "~/components/page-data";
import type { Product, ProductError } from "~/services/product";

/**
 * The catalog list. One key: every control on the screen (search, filter, sort,
 * pagination, the add button) is static, and the two things it feeds — the rows
 * and the counts — come from the same live list, so splitting it would only make
 * the count and the rows disagree for a frame.
 */
export type ProductData = { products: Product[] };

export const pageData = createPageData<ProductData, ProductError>("ProductPage");
