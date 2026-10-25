import { useSearchParams } from "react-router";
import { urlBackOf } from "~/lib/utils";

/**
 * The URL a screen links back to. `keep` passes an `url_back` that came from the
 * screen the cashier came from, through the shared parser (`getURLBack`) instead
 * of a third strength of validation.
 */
export function useGenerateUrlBack(base: string, keep = false) {
  const [search] = useSearchParams();
  if (keep) {
    const urlBack = urlBackOf(search);
    if (urlBack !== null) return urlBack;
  }
  const searchStr = search.toString();
  const urlBack = `${base}${searchStr ? `?${searchStr}` : ""}`;
  return urlBack;
}
