import { z } from "zod";

export function getURLBack(timestamp: number, mode: DB.Mode, search: URLSearchParams) {
	const parsed = z.string().safeParse(search.get("url_back"));
	const defaultURL = `/records?timestamp=${timestamp}&selected=${timestamp}&mode=${mode}`;
	const urlBack = parsed.success ? parsed.data : defaultURL;
	return urlBack;
}
