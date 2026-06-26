import z from "zod";

export function getURLBack(defaultURL: string, search: URLSearchParams) {
  const parsed = z.string().safeParse(search.get("url_back"));
  const urlBack = parsed.success ? parsed.data : defaultURL;
  return urlBack;
}