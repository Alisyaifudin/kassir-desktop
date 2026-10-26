import { createPageData } from "~/components/page-data";
import type { Extra, ExtraError } from "~/services/extra";

/**
 * One key: the whole extra catalog. The list route and the detail route each
 * register it, and the detail route finds its row in the same answer — a second
 * read by id would be a second source of truth for a list that is already live.
 */
type ExtraData = { extras: Extra[] };

// Cached: every key here is a live stream, so a return visit paints last
// visit's answer (flagged `refetching`) and the first emission confirms it.
export const pageData = createPageData<ExtraData, ExtraError>("ExtraPage", {
  cache: true,
});
