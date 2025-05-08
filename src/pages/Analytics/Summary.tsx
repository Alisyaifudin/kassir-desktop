import Decimal from "decimal.js";
import { getFlow } from "./records-grouping";

type Props = {
	records: DB.Record[];
	interval: "weekly" | "monthly" | "yearly";
	start: number;
	end: number;
	option: "profit" | "cashflow";
};

export function Summary({ records, interval, start, end, option }: Props) {
	const { revenues, spendings, debts } = getFlow({ records, interval, start, end });
	const profits: number[] = [];
	revenues.forEach((rev, i) => {
		const profit = rev - (spendings[i] - debts[i]);
		profits.push(profit);
	});
	const debtSum = calcSum(debts);
	switch (option) {
		case "profit":
			return (
				<div className="flex flex-col text-3xl">
					<p>Untung Total:</p>
					<p className="text-end">Rp{calcSum(profits).toLocaleString("id-ID")}</p>
				</div>
			);
		case "cashflow":
			return (
				<div className="flex flex-col gap-2 text-3xl">
					<p>Pemasukan Total:</p>
					<p className="text-end">Rp{calcSum(revenues).toLocaleString("id-ID")}</p>
					<p>Pengeluaran Total:</p>
					<p className="text-end">Rp{(calcSum(spendings) - debtSum).toLocaleString("id-ID")}</p>
					<p>Utang Total:</p>
					<p className="text-end">Rp{debtSum.toLocaleString("id-ID")}</p>
				</div>
			);
	}
}

function calcSum(vals: number[]): number {
	let val = new Decimal(0);
	for (const v of vals) {
		val = val.add(v);
	}
	return val.toNumber();
}
