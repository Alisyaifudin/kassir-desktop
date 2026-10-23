import { createPageData } from "~/components/page-data";
import type { Cashier, CashierError } from "~/services/cashier";

/** Master data: the till's accounts, read live, written per row. */
export type CashierData = { cashiers: Cashier[] };

export const pageData = createPageData<CashierData, CashierError>("CashierPage");
