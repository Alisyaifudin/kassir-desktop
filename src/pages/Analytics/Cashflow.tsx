import { cn } from "~/lib/utils";
import { getFlow, getTicks } from "./records-grouping";
import { useState } from "react";
import { Tooltip } from "./Tooltip";

type Props = {
	records: DB.Record[];
	interval: "weekly" | "monthly" | "yearly";
	start: number;
	end: number;
};

export function Cashflow({ records, interval, start, end }: Props) {
	const { revenues, spendings, labels } = getFlow({ records, interval, start, end });
	return (
		<div className="flex flex-col flex-1 py-5">
			<Graph orientation="up" vals={revenues} />
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
			<Graph orientation="down" vals={spendings} />
		</div>
	);
}

function Graph({ vals, orientation }: { vals: number[]; orientation: "up" | "down" }) {
	const maxVal = Math.max(...vals);
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
			<div
				className={cn("w-full h-full flex-1 flex gap-1", orientation === "up" ? "items-end" : "")}
			>
				{vals.map((v, i) => (
					<Bar orientation={orientation} v={v} key={i} maxVal={maxVal} length={vals.length} />
				))}
			</div>
		</div>
	);
}

function Bar({
	orientation,
	v,
	maxVal,
	length,
}: {
	orientation: "up" | "down";
	v: number;
	maxVal: number;
	length: number;
}) {
	const [isVisible, setIsVisible] = useState(false);
	const [position, setPosition] = useState({ x: 0, y: 0 });

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
		setPosition({ x: e.clientX, y: e.clientY });
	};
	return (
		<div
			onMouseEnter={() => setIsVisible(true)}
			onMouseLeave={() => setIsVisible(false)}
			onMouseMove={handleMouseMove}
			className={cn("h-full relative group flex hover:bg-zinc-100", {
				"items-end": orientation === "up",
			})}
			style={{ width: `${100 / length}%` }}
		>
			<div
				className={cn(
					"w-full",
					orientation === "up"
						? "bg-emerald-500 group-hover:bg-emerald-500/60"
						: "bg-red-500 group-hover:bg-red-500/60"
				)}
				style={{ height: `${(100 * v) / maxVal}%` }}
			/>
			<Tooltip position={position} visible={isVisible}>
				{v.toLocaleString("id-ID")}
			</Tooltip>
		</div>
	);
}
