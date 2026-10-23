import { createPageData } from "~/components/page-data";
import type { ProductFull, ProductError } from "~/services/product";

/**
 * One key for the whole detail route: the header's name, the publish toggle and
 * the three tabs all answer to the same product. Before this, the header and each
 * tab opened their own subscription to `changesFull`, so the same row was read
 * three times over.
 */
export type ProductDetailData = { products: ProductFull[] };

export const pageData = createPageData<ProductDetailData, ProductError>("ProductDetailPage");
