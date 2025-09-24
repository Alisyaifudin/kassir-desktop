import Decimal from "decimal.js";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Loader2, RefreshCcw } from "lucide-react";
import { Note } from "./Note";
import { useFix } from "../../../_hooks/use-fix";
import { useSummaryForm } from "./use-summary-form";
import { Method } from "./Method";
import { Customer } from "./Customer";
import { useMode } from "~/pages/Shop/_hooks/use-mode";
import { useCtx } from "~/pages/Shop/use-context";

export function Summary() {
	const [fix] = useFix();
	const [mode] = useMode();
	const { summary, clear } = useCtx();
	const { data, handleChange, handleSubmit, loading } = useSummaryForm();
	const change = new Decimal(Number(data.pay)).sub(summary.record.grandTotal);
	return (
		<div className="flex flex-col p-2 h-fit gap-2">
			<div className="flex flex-col gap-2  flex-1 h-full items-center justify-between">
				<div className="flex items-center justify-between w-full">
					<Button type="button" variant="destructive" onClick={() => clear(false)}>
						<RefreshCcw />
					</Button>
					<Method />
					<Customer />
					<Note />
				</div>
			</div>
			<form onSubmit={handleSubmit(0)} className="flex-1 flex flex-col gap-1 h-fit">
				{/* <div className="flex-1 flex flex-col gap-1 h-fit"> */}
				<label className="grid grid-cols-[160px_10px_1fr] items-center text-3xl">
					<span className="text-3xl">Bayar</span>
					:
					<Input
						type="number"
						value={data.pay}
						onChange={handleChange.pay}
						aria-autocomplete="list"
					/>
				</label>
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
				<div className="grid grid-cols-[160px_20px_1fr] h-[100px] text-3xl items-center">
					<p className="text-3xl">Kembalian</p>:
					<p className={cn("text-8xl", { "bg-red-500 text-white px-1": change.toNumber() < 0 })}>
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
				{/* </div> */}
			</form>
		</div>
	);
}
