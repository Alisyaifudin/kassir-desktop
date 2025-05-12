import { cn } from "~/lib/utils";
import { getFlow, getTicks } from "../records-grouping";
import { Bar } from "../Bar";
import { DatePicker } from "../DatePicker";

type Props = {
	records: DB.Record[];
	interval: "weekly" | "monthly" | "yearly";
	start: number;
	end: number;
	handleClickInterval: (val: string) => void;
	handleTime: (time: number) => void;
	time: number;
};

export function Profit({ records, interval, start, end, time, handleClickInterval, handleTime }: Props) {
	const { revenues, spendings, labels, debts } = getFlow({ records, interval, start, end });
	const profits: number[] = [];
	revenues.forEach((rev, i) => {
		const profit = rev - spendings[i] + debts[i];
		profits.push(profit);
	});
	return (
		<div className="flex flex-col gap-2 py-1 w-full h-full overflow-hidden">
			<DatePicker
				handleClickInterval={handleClickInterval}
				setTime={handleTime}
				time={time}
				option={"profit"}
				interval={interval}
			/>
			<div className="flex flex-col flex-1 py-5">
				<Graph orientation="up" vals={profits} />
				<div className="flex gap-1 w-full">
					<div className="w-[100px]"></div>
					<div className="flex gap-1 w-full">
						{labels.map((label) => (
							<div
								key={label}
								className="h-[50px] flex justify-center items-center text-2xl"
								style={{ width: `${100 / labels.length}%` }}
							>
								<p>{label}</p>
							</div>
						))}
					</div>
				</div>
				<Graph orientation="down" vals={profits} />
			</div>
		</div>
	);
}

function Graph({ vals, orientation }: { vals: number[]; orientation: "up" | "down" }) {
	let maxVal = Math.max(Math.max(...vals), -1 * Math.min(...vals));
	const ticks = getTicks(maxVal);
	return (
		<div className="flex gap-1 w-full h-full">
			<div className="relative h-full border-r w-[100px]">
				{ticks.map((tick) => (
					<p
						key={tick}
						className="right-1 absolute"
						style={{ top: `${((orientation === "up" ? maxVal - tick : tick) / maxVal) * 100}%` }}
					>
						{tick.toLocaleString("id-ID")}
					</p>
				))}
			</div>
			{orientation === "up" ? (
				<div className={cn("w-full h-full flex-1 flex gap-1", "items-end")}>
					{vals.map((v, i) =>
						v < 0.0001 ? (
							<div key={i} style={{ width: `${100 / vals.length}%` }} />
						) : (
							<Bar orientation={orientation} v={v} key={i} maxVal={maxVal} length={vals.length} />
						)
					)}
				</div>
			) : (
				<div className={cn("w-full h-full flex-1 flex gap-1")}>
					{vals.map((v, i) =>
						v > -0.0001 ? (
							<div key={i} style={{ width: `${100 / vals.length}%` }} />
						) : (
							<Bar orientation={orientation} v={-v} key={i} maxVal={maxVal} length={vals.length} />
						)
					)}
				</div>
			)}
		</div>
	);
}
