import { createPageData } from "~/components/page-data";
import type { MoneyError, PocketSummary } from "~/services/money";

/** The pocket cards on `/money`; the rail is the page. */
export type MoneyData = { pockets: PocketSummary[] };

// Cached: every key here is a live stream, so a return visit paints last
// visit's answer (flagged `refetching`) and the first emission confirms it.
export const pageData = createPageData<MoneyData, MoneyError>("MoneyPage", {
  cache: true,
});
