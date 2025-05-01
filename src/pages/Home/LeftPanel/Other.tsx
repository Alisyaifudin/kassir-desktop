import React from "react";
import { z } from "zod";
import { X } from "lucide-react";
import Decimal from "decimal.js";
import { calcOther } from "./submit";
import { Other } from "../schema";
import { SetOther } from "./useLocalStorage";
import { cn } from "../../../lib/utils";

export function OtherItem({
	mode,
	index,
	totalBeforeTax,
	other,
	set,
}: {
	mode: "sell" | "buy";
	index: number;
	totalBeforeTax: Decimal;
	other: Other;
	set: SetOther;
}) {
	const otherNumber = calcOther(totalBeforeTax, other);
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
		if (val === "percent" && other.value > 100) {
			set.value(mode, index, 100);
		}
		set.kind(mode, index, val);
	};
	const handleChangeValue = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = Number(e.currentTarget.value);
		if (isNaN(val) || val < 0 || (other.kind === "number" && !Number.isInteger(val))) {
			return;
		}
		set.value(mode, index, val);
	};
	const handleDelete = () => set.delete(mode, index);
	return (
		<div
			className={cn(
				"grid gap-1 text-3xl self-end",
				other.kind === "percent"
					? "grid-cols-[200px_70px_110px_200px_50px]"
					: "grid-cols-[275px_110px_35px_160px_50px]"
			)}
		>
			<input type="text" value={other.name} onChange={handleChangeName} />
			{other.kind === "number" ? (
				<select value={other.kind} className="w-fit" onChange={handleChangeKind}>
					<option value="number">Angka</option>
					<option value="percent">Persen</option>
				</select>
			) : null}
			{other.kind === "number" ? <p>Rp</p> : null}
			<input
				type="number"
				value={other.value === 0 ? "" : other.value}
				onChange={handleChangeValue}
			/>
			{other.kind === "percent" ? (
				<select value={other.kind} className="w-fit" onChange={handleChangeKind}>
					<option value="number">Angka</option>
					<option value="percent">Persen</option>
				</select>
			) : null}
			{other.kind === "percent" ? (
				<p className="text-end">Rp{otherNumber.toNumber().toLocaleString("id-ID")}</p>
			) : null}

			<div className="py-0.5 flex items-center">
				<button onClick={handleDelete} className="bg-red-500 text-white">
					<X size={35} />
				</button>
			</div>
		</div>
	);
}
