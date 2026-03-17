import { useSearchParams } from "react-router";

export function useGenerateUrlBack(base: string) {
  const [search] = useSearchParams();
  const searchStr = search.toString();
  const urlBack = `${base}${searchStr ? `?${searchStr}` : ""}`;
  return urlBack
}