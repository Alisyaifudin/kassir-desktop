import { createPageData } from "~/components/page-data";
import type { Customer, CustomerError } from "~/services/customer";

/** Pengaturan-adjacent master data: one list, read live, written per row. */
type CustomerData = { customers: Customer[] };

// Cached: every key here is a live stream, so a return visit paints last
// visit's answer (flagged `refetching`) and the first emission confirms it.
export const pageData = createPageData<CustomerData, CustomerError>("CustomerPage", {
  cache: true,
});
