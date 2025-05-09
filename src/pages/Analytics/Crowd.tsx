import { cn } from "~/lib/utils";
import { getTicks, getVisitors } from "./records-grouping";
import { Bar } from "./Bar";

type Props = {
	records: DB.Record[];
	daily: [number, number];
	weekly: [number, number];
};

export function Crowd({ records, daily, weekly }: Props) {
	const { visitors: visitorsDaily, labels: labelsDaily } = getVisitors({
		records,
		interval: "daily",
		start: daily[0],
		end: daily[1],
	});
	const { visitors: visitorsWeekly, labels: labelsWeekly } = getVisitors({
		records,
		interval: "weekly",
		start: weekly[0],
		end: weekly[1],
	});
	return (
		<div className="flex flex-col flex-1 py-5">
			<Graph vals={visitorsDaily.filter((_, i) => i >= 6)} />
			<div className="flex gap-1 w-full">
				<div className="w-[100px]"></div>
				<div className="flex gap-1 w-full">
					{labelsDaily
						.filter((_, i) => i >= 6)
						.map((label) => (
							<div
								key={label}
								className="h-[50px] flex justify-center items-center text-2xl"
								style={{ width: `${100 / labelsDaily.filter((_, i) => i>=6).length}%` }}
							>
								<p>{label}</p>
							</div>
						))}
				</div>
			</div>
			<Graph vals={visitorsWeekly} />
			<div className="flex gap-1 w-full">
				<div className="w-[100px]"></div>
				<div className="flex gap-1 w-full">
					{labelsWeekly.map((label) => (
						<div
							key={label}
							className="h-[50px] flex justify-center items-center text-2xl"
							style={{ width: `${100 / labelsWeekly.length}%` }}
						>
							<p>{label}</p>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function Graph({ vals }: { vals: number[] }) {
	const maxVal = Math.max(...vals);
	const ticks = getTicks(maxVal);
	return (
		<div className="flex gap-1 w-full h-full">
			<div className="relative h-full border-r w-[100px]">
				{ticks.map((tick) => (
					<p
						key={tick}
						className="right-1 absolute"
						style={{ top: `${((maxVal - tick) / maxVal) * 100}%` }}
					>
						{tick.toLocaleString("id-ID")}
					</p>
				))}
			</div>
			<div className={cn("w-full h-full flex-1 flex gap-1", "items-end")}>
				{vals.map((v, i) => (
					<Bar orientation={"up"} v={v} key={i} maxVal={maxVal} length={vals.length} />
				))}
			</div>
		</div>
	);
}
