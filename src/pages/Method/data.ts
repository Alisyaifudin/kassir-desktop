import { createPageData } from "~/components/page-data";
import type { MethodCatalog, MethodError } from "~/services/method";

/** One catalog read, one default per kind — a single value, so a single key. */
export type MethodData = { catalog: MethodCatalog };

export const pageData = createPageData<MethodData, MethodError>("MethodPage");
