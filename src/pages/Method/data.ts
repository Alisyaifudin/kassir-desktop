import { createPageData } from "~/components/page-data";
import type { MethodCatalog, MethodError } from "~/services/method";

/** One catalog read, one default per kind — a single value, so a single key. */
export type MethodData = { catalog: MethodCatalog };

// Cached: every key here is a live stream, so a return visit paints last
// visit's answer (flagged `refetching`) and the first emission confirms it.
export const pageData = createPageData<MethodData, MethodError>("MethodPage", {
  cache: true,
});
