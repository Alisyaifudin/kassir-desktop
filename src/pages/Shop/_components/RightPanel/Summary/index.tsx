import Decimal from "decimal.js";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Loader2, RefreshCcw } from "lucide-react";
import { Note } from "./Note";
import { useFix } from "../../../_hooks/use-fix";
import { useSummaryForm } from "../../../_hooks/use-summary-form";
import { Method } from "./Method";
import { Summary as SummaryRecord } from "~/pages/shop/_utils/generate-record";
import { LocalContext } from "~/pages/shop/_hooks/use-local-state";
import { Context } from "~/pages/shop/Shop";

export function Summary({
	mode,
	localContext,
	summary,
	context
}: {
	mode: DB.Mode;
	localContext: LocalContext;
	summary: SummaryRecord;
	context: Context
}) {
	const [fix] = useFix(localContext);
	const { data, handleChange, handleSubmit, loading, clear } = useSummaryForm(
		mode,
		summary,
		localContext,
		context
	);
	const change = new Decimal(Number(data.pay)).sub(summary.record.grandTotal);
	return (
		<div className="flex flex-col p-2 h-fit gap-2">
			<div className="flex flex-col gap-2  flex-1 h-full items-center justify-between">
				<div className="flex items-center justify-between w-full">
					<Button variant="destructive" onClick={clear(localContext)}>
						<RefreshCcw />
					</Button>
					<Method context={localContext} />
					<Note context={localContext} />
				</div>
			</div>
			<form onSubmit={handleSubmit(0)} className="flex-1 flex flex-col gap-1 h-fit">
				<label className="grid grid-cols-[160px_10px_1fr] items-center text-3xl">
					<span className="text-3xl">Bayar</span>
					:
					<Input type="number" value={data.pay} onChange={handleChange.pay} aria-autocomplete="list" />
				</label>
				<div className="flex gap-2">
					<label className="grid grid-cols-[160px_10px_1fr] items-center flex-1 text-3xl">
						<span className="text-3xl">Diskon</span>
						:
						<Input
							type="number"
							value={data.discVal}
							step={data.discKind === "number" ? Math.pow(10, -1 * fix) : 0.00001}
							onChange={handleChange.discVal}
							aria-autocomplete="list"
						/>
					</label>
					<select
						value={data.discKind}
						onChange={handleChange.discKind}
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
						value={data.rounding}
						step={Math.pow(10, -1 * fix)}
						onChange={handleChange.rounding}
						aria-autocomplete="list"
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
							summary.record.pay === 0 ||
							summary.record.grandTotal === 0 ||
							(summary.items.length === 0 && summary.additionals.length === 0)
						}
					>
						Bayar {loading && <Loader2 className="animate-spin" />}
					</Button>
					{mode === "buy" ? (
						<Button
							disabled={summary.record.grandTotal === 0}
							className="flex-1"
							onClick={handleSubmit(1) as any}
							type="button"
						>
							Kredit {loading && <Loader2 className="animate-spin" />}
						</Button>
					) : null}
				</div>
			</form>
		</div>
	);
}
