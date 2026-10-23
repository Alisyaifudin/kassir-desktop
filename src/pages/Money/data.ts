import { createPageData } from "~/components/page-data";
import type { MoneyError, PocketSummary } from "~/services/money";

/** The pocket cards on `/money`; the rail is the page. */
export type MoneyData = { pockets: PocketSummary[] };

export const pageData = createPageData<MoneyData, MoneyError>("MoneyPage");
