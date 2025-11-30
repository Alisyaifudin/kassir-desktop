import { generateRecordSummary, Summary } from "~/lib/record";
import Decimal from "decimal.js";
import { RecordSide } from "./RecordSide";
import { ItemList } from "./ItemList";
import { useSearchParams } from "react-router";
import { getParam } from "../_utils/params";
import type { Context } from "../Records";
import { useSize } from "~/hooks/use-size";

const grid = {
	big: {
		gridTemplateColumns: "530px 1px 1fr",
	},
	small: {
		gridTemplateColumns: "400px 1px 1fr",
	},
};

export function Record({
	revalidate,
	records: rawRecords,
	items,
	additionals,
	discounts,
	methods,
	context,
}: {
	revalidate: () => void;
	records: DB.Record[];
	items: DB.RecordItem[];
	additionals: DB.Additional[];
	discounts: DB.Discount[];
	methods: DB.Method[];
	context: Context;
}) {
	const [search] = useSearchParams();
	const size = useSize();
	const method = getParam(search).method(methods);
	const mode = getParam(search).mode;
	const query = getParam(search).query;
	const selected = getParam(search).selected;
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
	return (
		<div style={grid[size]} className="grid gap-2 h-full overflow-hidden">
			<RecordSide capital={capital} total={total} records={summaries.map((r) => r.record)} />
			<div className="border-l" />
			<ItemList
				timestamp={selected}
				allAdditionals={summaries.flatMap((s) => s.additionals)}
				allItems={summaries.flatMap((s) => s.items)}
				methods={methods}
				records={summaries.map((s) => s.record)}
				revalidate={revalidate}
				context={context}
			/>
		</div>
	);
}

function calcSummary(summaries: Summary[]) {
	let total = new Decimal(0);
	let capital = new Decimal(0);
	for (const { record } of summaries) {
		total = total.add(record.grandTotal);
	}
	const sellTimestamp = summaries
		.filter((s) => s.record.mode === "sell")
		.map((r) => r.record.timestamp);
	for (const s of summaries) {
		for (const item of s.items) {
			if (!sellTimestamp.includes(item.timestamp)) {
				continue;
			}
			const t = new Decimal(item.capital).times(item.qty);
			capital = capital.add(t);
		}
	}
	return { total: total.toNumber(), capital: capital.toNumber() };
}
