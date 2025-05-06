import { Button } from "../../../components/ui/button";
import { useEffect } from "react";
import { cn } from "../../../lib/utils";
import { Additional, ItemWithoutDisc } from "../schema";
import { useLocalStorage } from "./useLocalStorage";
import { Loader2 } from "lucide-react";
import { ItemComponent } from "./Item";
import { AdditionalItem } from "./Additional";
import { Summary } from "./Summary";
import { calcTotalAfterDisc, calcTotalBeforeDisc, calcTotalTax } from "./submit";
import { useUser } from "../../../Layout";

export function LeftPanel({
	newItem,
	newAdditional,
	reset,
	mode,
	changeMode,
}: {
	newItem: ItemWithoutDisc | null;
	newAdditional: Additional | null;
	reset: () => void;
	mode: "sell" | "buy";
	changeMode: (mode: "sell" | "buy") => void;
}) {
	const user = useUser();
	const { set, data, ready } = useLocalStorage(mode);
	const { items, additionals, disc, pay, rounding, cashier, method, note } = data;
	useEffect(() => {
		if (newItem) {
			set.items.add(mode, newItem);
			reset();
		}
		if (newAdditional) {
			set.additionals.add(mode, newAdditional);
			reset();
		}
	}, [newItem, newAdditional]);
	const totalReset = () => {
		reset();
		set.items.reset(mode);
		set.additionals.reset(mode);
		set.discVal(mode, 0);
		set.discType(mode, "percent");
		set.method(mode, "cash");
		set.note(mode, "");
		set.pay(mode, 0);
		set.rounding(mode, 0);
	};
	if (!ready) {
		return <Loader2 className="animate-splin" />;
	}
	const totalBeforeDisc = calcTotalBeforeDisc(items);
	const totalAfterDisc = calcTotalAfterDisc(totalBeforeDisc, disc);
	const totalTax = calcTotalTax(totalAfterDisc, additionals);
	const totalAfterTax = totalAfterDisc.add(totalTax);
	const grandTotal = totalAfterTax.add(rounding);
	return (
		<div className="border-r flex-1 flex flex-col gap-2">
			<div className="outline flex-1 p-1 flex flex-col gap-1 overflow-y-auto">
				<div className="flex gap-2 items-center justify-between">
					<div className="flex items-center gap-1">
						<Button
							className={mode === "sell" ? "text-2xl font-bold" : "text-black/50"}
							variant={mode === "sell" ? "default" : "ghost"}
							onClick={() => changeMode("sell")}
						>
							<h2 className="">Jual</h2>
						</Button>
						{user.role === "admin" ? (
							<Button
								className={mode === "buy" ? "text-2xl font-bold" : "text-black/50"}
								variant={mode === "buy" ? "default" : "ghost"}
								onClick={() => changeMode("buy")}
							>
								<h2 className="">Beli</h2>
							</Button>
						) : null}
					</div>
					<p className="text-3xl px-2">Kasir: {user.name}</p>
				</div>
				<div
					className={cn(
						"grid gap-1 outline text-3xl",
						"grid-cols-[70px_1fr_150px_230px_70px_150px_50px]"
					)}
				>
					<p className="border-r">No</p>
					<p className="border-r">Nama</p>
					<p className="border-r">Harga</p>
					<p className="border-r">Diskon</p>
					<p className="border-r">Qty</p>
					<p>Subtotal</p>
					<div />
				</div>
				<div className="flex text-3xl flex-col overflow-y-auto">
					{items.map((item, i) => (
						<ItemComponent {...item} index={i} key={i} mode={mode} item={item} set={set.items} />
					))}
					{additionals.length > 0 ? (
						<div className="self-end w-[410px] justify-between flex gap-2">
							<p>Subtotal:</p>
							<p className="font-bold">Rp{totalAfterDisc.toNumber().toLocaleString("id-ID")}</p>
							<div className="w-[50px]" />
						</div>
					) : null}
					{additionals.map((add, i) => (
						<AdditionalItem
							index={i}
							key={i}
							mode={mode}
							set={set.additionals}
							additional={add}
							totalBeforeTax={totalAfterDisc}
						/>
					))}
				</div>
			</div>
			<Summary
				grandTotal={grandTotal.toNumber()}
				mode={mode}
				totalAfterDisc={totalAfterDisc.toNumber()}
				totalAfterTax={totalAfterTax.toNumber()}
				totalBeforeDisc={totalBeforeDisc.toNumber()}
				totalTax={totalTax.toNumber()}
				data={{
					cashier,
					disc,
					items,
					method,
					note,
					additionals: additionals,
					pay,
					rounding,
				}}
				reset={totalReset}
				set={{
					note: set.note,
					reset: totalReset,
					discType: set.discType,
					discVal: set.discVal,
					pay: set.pay,
					rounding: set.rounding,
					method: set.method,
				}}
			/>
		</div>
	);
}
