import Decimal from "decimal.js";
import { submitPayment } from "../submit";
import { Input } from "~/components/ui/input";
import { z } from "zod";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Loader2, RefreshCcw } from "lucide-react";
import { TextError } from "~/components/TextError";
import { useState } from "react";
import { useDB } from "~/RootLayout";
import { useNavigate } from "react-router";
import { Note } from "./Note";
import { Method } from "./Method";
import { useFix, useLocalData, useSetData, useSummary } from "../context";
import { useUser } from "~/Layout";

type Props = {
	mode: "sell" | "buy";
	reset: () => void;
};

export function Summary({ reset, mode }: Props) {
	const [pay, setPay] = useState(0);
	const [loading, setLoading] = useState(false);
	const { name: cashier } = useUser();
	const [error, setError] = useState("");
	const { fix } = useFix();
	const set = useSetData();
	const { rounding, disc, items, additionals, method, methodType, note } = useLocalData();
	const { grandTotal, totalAfterDisc, totalAfterTax, totalBeforeDisc, totalTax } = useSummary();
	const db = useDB();
	const change = new Decimal(pay).sub(grandTotal);
	const navigate = useNavigate();
	const handlePay = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = Number(Number(e.currentTarget.value).toFixed(fix));
		if (isNaN(val)) {
			return;
		}
		setPay(val);
	};
	const handleRounding = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = Number(Number(e.currentTarget.value).toFixed(fix));
		if (isNaN(val)) {
			return;
		}
		set.rounding(mode, val);
	};
	const handleDiscType = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const parsed = z.enum(["percent", "number"]).safeParse(e.currentTarget.value);
		if (!parsed.success) {
			return;
		}
		const val = parsed.data;
		if (val === "percent" && disc.value > 100) {
			set.discVal(mode, 100);
		} else if (val === "number") {
			set.discVal(mode, Number(disc.value.toFixed(fix)));
		}
		set.discType(mode, val);
	};
	const handleDiscVal = (e: React.ChangeEvent<HTMLInputElement>) => {
		let val = Number(e.currentTarget.value);
		if (isNaN(val) || val < 0 || (disc.type === "percent" && val > 100)) {
			return;
		}
		if (disc.type === "number") {
			val = Number(val.toFixed(fix));
		}
		set.discVal(mode, val);
	};
	const handleSubmit = (credit: 0 | 1) => async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (loading) return;
		if (
			(items.length === 0 && additionals.length === 0) ||
			(credit === 0 && change.toNumber() < 0)
		) {
			return;
		}
		setLoading(true);
		const [errMsg, timestamp] = await submitPayment(
			db,
			mode,
			fix,
			{
				cashier,
				change: change.toNumber(),
				credit,
				disc,
				method,
				methodType,
				note,
				pay,
				rounding,
				grandTotal,
				totalAfterDisc,
				totalAfterTax,
				totalBeforeDisc,
				totalTax,
			},
			items,
			additionals
		);
		setLoading(false);
		if (errMsg !== null) {
			setError(errMsg);
			return;
		}
		reset();
		navigate(`/records/${timestamp}`);
		db.product.revalidate("all");
	};
	return (
		<div className="flex flex-col p-2 h-fit gap-2">
			<div className="flex flex-col gap-2  flex-1 h-full items-center justify-between">
				<div className="flex items-center justify-between w-full">
					<Button variant="destructive" onClick={reset}>
						<RefreshCcw />
					</Button>
					<Method
						method={method}
						methodType={methodType}
						mode={mode}
						setMethod={set.method}
						setMethodType={set.methodType}
					/>
					<Note note={note} changeNote={(note) => set.note(mode, note)} />
				</div>
			</div>
			<form onSubmit={handleSubmit(0)} className="flex-1 flex flex-col gap-1 h-fit">
				<label className="grid grid-cols-[160px_10px_1fr] items-center text-3xl">
					<span className="text-3xl">Bayar</span>
					:
					<Input type="number" value={pay === 0 ? "" : pay} onChange={handlePay} />
				</label>
				<div className="flex gap-2">
					<label className="grid grid-cols-[160px_10px_1fr] items-center flex-1 text-3xl">
						<span className="text-3xl">Diskon</span>
						:
						<Input
							type="number"
							value={disc.value === 0 ? "" : disc.value}
							step={disc.type === "number" ? Math.pow(10, -1 * fix) : 0.00001}
							onChange={handleDiscVal}
						/>
					</label>
					<select
						value={disc.type}
						onChange={handleDiscType}
						className=" w-[100px] outline text-2xl"
					>
						<option value="number">Angka</option>
						<option value="percent">Persen</option>
					</select>
				</div>
				<label className="grid grid-cols-[160px_10px_1fr] items-center text-3xl">
					<span className="text-3xl">Pembulatan</span>
					:
					<Input
						type="number"
						value={rounding === 0 ? "" : rounding}
						step={Math.pow(10, -1 * fix)}
						onChange={handleRounding}
					/>
				</label>
				<div className="grid grid-cols-[160px_20px_1fr] h-[60px] text-3xl items-center">
					<p className="text-3xl">Kembalian</p>:
					<p className={cn("text-3xl", { "bg-red-500 text-white px-1": change.toNumber() < 0 })}>
						{Number(change.toFixed(fix)).toLocaleString("id-ID")}
					</p>
				</div>
				<div className="flex items-center gap-1 w-full">
					<Button
						className="flex-1"
						type="submit"
						disabled={
							change.toNumber() < 0 ||
							pay === 0 ||
							grandTotal === 0 ||
							(items.length === 0 && additionals.length === 0)
						}
					>
						Bayar {loading && <Loader2 className="animate-spin" />}
					</Button>
					{mode === "buy" ? (
						<Button
							disabled={grandTotal === 0}
							className="flex-1"
							onClick={handleSubmit(1) as any}
							type="button"
						>
							Kredit {loading && <Loader2 className="animate-spin" />}
						</Button>
					) : null}
				</div>
				{error === "" ? null : <TextError>{error}</TextError>}
			</form>
		</div>
	);
}
