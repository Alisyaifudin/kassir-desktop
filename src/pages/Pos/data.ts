import { createPageData } from "~/components/page-data";
import type { Customer, CustomerError } from "~/services/customer";
import type { Extra, ExtraError } from "~/services/extra";
import type { MethodCatalog, MethodError } from "~/services/method";
import type { Draft as DraftModel, TransactionError } from "~/services/transaction";

/**
 * The till's four reads, registered together so they start together.
 *
 * Before this the screen was one `Loader` over the drafts, and everything else
 * (payment methods, the customer picker, the extras catalog) mounted *inside* it
 * — so each of them only began after the drafts had answered. Here they are four
 * keys, subscribed in parallel: the tab strip, the search bar, `+manual`, the
 * stage toggle, the rounding field, `Bayar`, the cashier name and the options
 * button all read values that either are already here or pulse in place.
 */
type PosData = {
  drafts: DraftModel[];
  methods: MethodCatalog;
  customers: Customer[];
  extras: Extra[];
};

export const pageData = createPageData<
  PosData,
  TransactionError | MethodError | CustomerError | ExtraError
>("PosPage", {
  /**
   * All four reads are live streams, so a seeded value is always painted as
   * `refetching` — "this is last visit's answer, the subscription is confirming
   * it right now". That flag is what makes caching `drafts` safe: the screen
   * *writes* from that list ("no open cart yet, make one"), so it waits for the
   * confirmation instead of acting on an older visit's tabs.
   */
  cache: true,
});
