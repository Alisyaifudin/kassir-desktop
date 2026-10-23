import { createPageData } from "~/components/page-data";
import type { Customer, CustomerError } from "~/services/customer";

/** Pengaturan-adjacent master data: one list, read live, written per row. */
export type CustomerData = { customers: Customer[] };

export const pageData = createPageData<CustomerData, CustomerError>("CustomerPage");
