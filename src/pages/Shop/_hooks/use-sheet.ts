import { useSearchParams } from "react-router";
import { numeric } from "~/lib/utils";

export function useSheet() {
	const [search, setSearch] = useSearchParams();
	const sheet = numeric.catch(0).parse(search.get("sheet"));
	function setSheet(sheet: number) {
		if (sheet < 0 || sheet > 100) {
			return;
		}
		setSearch((prev) => {
			const search = new URLSearchParams(prev);
			search.set("sheet", sheet.toString());
			return search;
		});
	}
	return [sheet, setSheet] as const;
}
