import { useSearchParams } from "react-router";
import { z } from "zod";

export function useGenerateUrlBack(base: string, keep = false) {
  const [search] = useSearchParams();
  if (keep) {
    const parsed = z.string().safeParse(search.get("url_back"));
    if (parsed.success) {
      return parsed.data;
    }
  }
  const searchStr = search.toString();
  const urlBack = `${base}${searchStr ? `?${searchStr}` : ""}`;
  return urlBack;
}
