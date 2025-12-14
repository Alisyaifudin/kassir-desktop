import { useSearchParams } from "react-router";
import { getParam } from "./utils/params";
import { generateRecordSummary } from "~/lib/record";
import { calcSummary } from "./utils/summary";

export function useSummary(
	methods: DB.Method[],
	rawRecords: DB.Record[],
	items: DB.RecordItem[],
	additionals: DB.Additional[],
	discounts: DB.Discount[]
) {
	const [search] = useSearchParams();
	const method = getParam(search).method(methods);
	const { mode, query } = getParam(search);
	const filtered =
		query.trim() === ""
			? items
			: items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
	const timestamps = filtered.map((f) => f.timestamp);
	let records =
		query.trim() === "" ? rawRecords : rawRecords.filter((r) => timestamps.includes(r.timestamp));
	records = records.filter((record) => record.mode === mode);
	// filter by method
	if (method !== null) {
		if (method.name === null) {
			const topLevelMethods = methods.filter((m) => m.method === method.method).map((m) => m.id);
			records = records.filter((r) => topLevelMethods.includes(r.method_id));
		} else {
			records = records.filter((r) => method.id === r.method_id);
		}
	}
	const summaries = records.map((record) =>
		generateRecordSummary({ record, items, additionals, discounts })
	);
	const { total, capital } = calcSummary(summaries);
	return { total, capital, summaries };
}
