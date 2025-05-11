import { cn } from "~/lib/utils";
import { getFlow, getTicks } from "../records-grouping";
import { Bar } from "../Bar";
import { useState } from "react";
import { Tooltip } from "../../../components/Tooltip";

type Props = {
	records: DB.Record[];
	interval: "weekly" | "monthly" | "yearly";
	start: number;
	end: number;
};

export function Cashflow({ records, interval, start, end }: Props) {
	const { revenues, spendings, labels, debts } = getFlow({ records, interval, start, end });
	return (
		<div className="flex flex-col flex-1 py-5">
			<GraphUp vals={revenues} />
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
			<GraphDown debts={debts} vals={spendings} />
		</div>
	);
}

function GraphUp({ vals }: { vals: number[] }) {
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

function GraphDown({ vals, debts }: { vals: number[]; debts: number[] }) {
	const maxVal = Math.max(...vals);
	const ticks = getTicks(maxVal);
	return (
		<div className="flex gap-1 w-full h-full">
			<div className="relative h-full border-r w-[100px]">
				{ticks.map((tick) => (
					<p key={tick} className="right-1 absolute" style={{ top: `${(tick / maxVal) * 100}%` }}>
						{tick.toLocaleString("id-ID")}
					</p>
				))}
			</div>
			<div className={cn("w-full h-full flex-1 flex gap-1")}>
				{vals.map((v, i) => (
					<BarWithDebt v={v} key={i} maxVal={maxVal} length={vals.length} debt={debts[i]} />
				))}
			</div>
		</div>
	);
}

function BarWithDebt({
	v,
	maxVal,
	length,
	debt,
}: {
	v: number;
	debt: number;
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
			className={cn("h-full relative group flex hover:bg-zinc-100")}
			style={{ width: `${100 / length}%` }}
		>
			<div
				className="flex flex-col w-full"
				style={{ height: `${maxVal === 0 ? 0 : (100 * v) / maxVal}%` }}
			>
				<div
					style={{ height: `${maxVal === 0 ? 0 : (100 * (v - debt)) / v}%` }}
					className={cn("w-full bg-red-500 group-hover:bg-red-500/60")}
				/>
				<div
					style={{ height: `${maxVal === 0 ? 0 : (100 * debt) / v}%` }}
					className={cn("w-full bg-red-400 group-hover:bg-red-400/60")}
				/>
			</div>
			<Tooltip position={position} visible={isVisible}>
				<p className="text-3xl">{(v - debt).toLocaleString("id-ID")}</p>
				{debt === 0 ? null : <p className="text-3xl">{debt.toLocaleString("id-ID")}</p>}
			</Tooltip>
		</div>
	);
}
