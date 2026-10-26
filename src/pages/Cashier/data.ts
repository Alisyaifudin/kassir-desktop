import { createPageData } from "~/components/page-data";
import type { Cashier, CashierError } from "~/services/cashier";

/** Master data: the till's accounts, read live, written per row. */
type CashierData = { cashiers: Cashier[] };

// Cached: every key here is a live stream, so a return visit paints last
// visit's answer (flagged `refetching`) and the first emission confirms it.
export const pageData = createPageData<CashierData, CashierError>("CashierPage", {
  cache: true,
});
