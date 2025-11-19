import Decimal from "decimal.js";
import { getFlow, getVisitors } from "../_utils/group-items";
import { Temporal } from "temporal-polyfill";
import { RecordTransform } from "~/lib/record";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

type Props = {
	records: RecordTransform[];
	interval: "weekly" | "monthly" | "yearly";
	start: number;
	end: number;
	time: number;
	option: "net" | "cashflow" | "crowd";
};

export function Summary({ records, interval, start, end, option, time }: Props) {
	const size = useSize();
	const { revenues, spendings, debts } = getFlow({ records, interval, start, end });
	const profits: number[] = [];
	revenues.forEach((rev, i) => {
		const profit = rev - (spendings[i] - debts[i]);
		profits.push(profit);
	});
	const debtSum = calcSum(debts);
	switch (option) {
		case "net":
			return (
				<div style={style[size].text} className="flex flex-col text-3xl">
					<p>Untung Total:</p>
					<p className="text-end">Rp{calcSum(profits).toLocaleString("id-ID")}</p>
				</div>
			);
		case "cashflow":
			return (
				<div style={style[size].text} className="flex flex-col gap-2 text-3xl">
					<p>Pemasukan Total:</p>
					<p className="text-end">Rp{calcSum(revenues).toLocaleString("id-ID")}</p>
					<p>Pengeluaran Total:</p>
					<p className="text-end">Rp{(calcSum(spendings) - debtSum).toLocaleString("id-ID")}</p>
					<p>Utang Total:</p>
					<p className="text-end">Rp{debtSum.toLocaleString("id-ID")}</p>
				</div>
			);
		case "crowd":
			const tz = Temporal.Now.timeZoneId();
			const startOfDay = Temporal.Instant.fromEpochMilliseconds(time)
				.toZonedDateTimeISO(tz)
				.startOfDay();
			const endOfDay = startOfDay.add(Temporal.Duration.from({ days: 1 }));
			const { visitors: visitorsDaily } = getVisitors({
				records,
				interval: "daily",
				start: startOfDay.epochMilliseconds,
				end: endOfDay.epochMilliseconds,
			});
			const { visitors: visitorsWeekly } = getVisitors({
				records,
				interval: "weekly",
				start,
				end,
			});
			return (
				<div style={style[size].text} className="flex flex-col gap-2 text-3xl">
					<p>Harian: {calcSum(visitorsDaily)}</p>
					<p>Mingguan: {calcSum(visitorsWeekly)}</p>
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
