import { createPageData } from "~/components/page-data";
import type { ProductFull, ProductError } from "~/services/product";

/**
 * One key for the whole detail route: the header's name, the publish toggle and
 * the three tabs all answer to the same product. Before this, the header and each
 * tab opened their own subscription to `changesFull`, so the same row was read
 * three times over.
 */
export type ProductDetailData = { products: ProductFull[] };

// Cached: every key here is a live stream, so a return visit paints last
// visit's answer (flagged `refetching`) and the first emission confirms it.
export const pageData = createPageData<ProductDetailData, ProductError>("ProductDetailPage", {
  cache: true,
});
