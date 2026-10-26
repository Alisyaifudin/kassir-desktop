import { useSearchParams } from "react-router";

/**
 * The URL a screen links back to: `base` plus the current query. A caller that
 * has to keep an incoming `url_back` uses `useGetUrlBack` instead, so this hook
 * never re-writes the one it was handed.
 */
export function useGenerateUrlBack(base: string) {
  const [search] = useSearchParams();
  const searchStr = search.toString();
  return `${base}${searchStr ? `?${searchStr}` : ""}`;
}
