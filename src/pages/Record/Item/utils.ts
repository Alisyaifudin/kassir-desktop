export function getURLBack(timestamp: number, mode: DB.Mode, search: URLSearchParams) {
	const url = search.get("url_back");
	const defaultURL = `/records?timestamp=${timestamp}&selected=${timestamp}&mode=${mode}`;
	const urlBack = url ?? defaultURL;
	return urlBack;
}
