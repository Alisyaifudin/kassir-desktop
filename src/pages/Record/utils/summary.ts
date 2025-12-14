import Decimal from "decimal.js";

export function calcSummary(summaries: Summary[]) {
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