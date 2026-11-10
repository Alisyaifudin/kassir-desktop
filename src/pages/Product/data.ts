import { createPageData } from "~/components/page-data";
import type { Category, CategoryError } from "~/services/category";
import type { Product, ProductError } from "~/services/product";

/**
 * The catalog list. The rows are one key: every control on the screen (search,
 * filter, sort, pagination, the add button) is static, and the two things that key
 * feeds — the rows and the counts — come from the same live list, so splitting it
 * would only make the count and the rows disagree for a frame.
 *
 * `categories` is the one key from another service: the filter dialog picks from
 * it, and the search matches category *names*, which the product read does not
 * carry (ids only). It is small metadata — a handful of rows, read alongside the
 * catalog — so it is registered here rather than in a second provider, and
 * neither key queues behind the other.
 */
type ProductData = { products: Product[]; categories: Category[] };

/** Everything a Product key can fail with: the catalog read and the categories. */
type ProductErrorUnion = ProductError | CategoryError;

// Cached: every key here is a live stream, so a return visit paints last
// visit's answer (flagged `refetching`) and the first emission confirms it.
export const pageData = createPageData<ProductData, ProductErrorUnion>("ProductPage", {
  cache: true,
});
