import React from "react";
import { z } from "zod";
import { X } from "lucide-react";
import Decimal from "decimal.js";
import { calcAdditional } from "./submit";
import { Additional } from "../schema";
import { SetAdditional } from "./useLocalStorage";
import { cn } from "../../../lib/utils";

export function AdditionalItem({
	mode,
	index,
	totalBeforeTax,
	additional,
	set,
	fix
}: {
	mode: "sell" | "buy";
	index: number;
	totalBeforeTax: Decimal;
	additional: Additional;
	set: SetAdditional;
	fix: number;
}) {
	const additionalNumber = calcAdditional(totalBeforeTax, additional, fix);
	const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.currentTarget.value.trim();
		set.name(mode, index, val);
	};
	const handleChangeKind = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const parsed = z.enum(["percent", "number"]).safeParse(e.currentTarget.value);
		if (!parsed.success) {
			return;
		}
		const val = parsed.data;
		if (val === "percent" && additional.value > 100) {
			set.value(mode, index, 100);
		}
		set.kind(mode, index, val);
	};
	const handleChangeValue = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = Number(e.currentTarget.value);
		if (isNaN(val) || val < 0 || (additional.kind === "number" && !Number.isInteger(val))) {
			return;
		}
		set.value(mode, index, val);
	};
	const handleDelete = () => set.delete(mode, index);
	return (
		<div
			className={cn(
				"grid gap-1 text-3xl self-end",
				additional.kind === "percent"
					? "grid-cols-[200px_70px_110px_200px_50px]"
					: "grid-cols-[275px_110px_35px_160px_50px]"
			)}
		>
			<input type="text" value={additional.name} onChange={handleChangeName} />
			{additional.kind === "number" ? (
				<select value={additional.kind} className="w-fit" onChange={handleChangeKind}>
					<option value="number">Angka</option>
					<option value="percent">Persen</option>
				</select>
			) : null}
			{additional.kind === "number" ? <p>Rp</p> : null}
			<input
				type="number"
				value={additional.value === 0 ? "" : additional.value}
				onChange={handleChangeValue}
			/>
			{additional.kind === "percent" ? (
				<select value={additional.kind} className="w-fit" onChange={handleChangeKind}>
					<option value="number">Angka</option>
					<option value="percent">Persen</option>
				</select>
			) : null}
			{additional.kind === "percent" ? (
				<p className="text-end">Rp{additionalNumber.toNumber().toLocaleString("id-ID")}</p>
			) : null}

			<div className="py-0.5 flex items-center">
				<button onClick={handleDelete} className="bg-red-500 text-white">
					<X size={35} />
				</button>
			</div>
		</div>
	);
}
