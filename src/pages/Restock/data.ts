import { createPageData } from "~/components/page-data";
import type { MethodCatalog, MethodError } from "~/services/method";
import type { Supplier, SupplierError } from "~/services/supplier";
import type { Draft as DraftModel, TransactionError } from "~/services/transaction";

/**
 * The purchase screen's reads, registered together so they start together.
 *
 * Same shape as `pages/Pos/data.ts`: the drafts are the cart itself, and the
 * payment stage's two catalogues (methods, suppliers) are their own keys — so the
 * strip's frame, the accordion's wording and the goods grid are on screen while
 * the catalogues are still arriving, instead of after them.
 */
type RestockData = {
  drafts: DraftModel[];
  methods: MethodCatalog;
  suppliers: Supplier[];
};

// Cached: all three reads are live streams, so a seeded `drafts` is painted as
// `refetching` and the screen's `ready` waits for the confirmation before it acts
// on the list (see `page.tsx`).
export const pageData = createPageData<
  RestockData,
  TransactionError | MethodError | SupplierError
>("RestockPage", {
  cache: true,
});
