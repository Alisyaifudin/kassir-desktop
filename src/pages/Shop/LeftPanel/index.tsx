import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { ItemComponent } from "./Item";
import { AdditionalItem } from "./Additional";
import { useUser } from "~/Layout";
import {  useFix, useLocalData, useSummary } from "../context";

export function LeftPanel({
	mode,
	changeMode,
}: {
	mode: "sell" | "buy";
	changeMode: (mode: "sell" | "buy") => void;
}) {
	const user = useUser();
	const { fix } = useFix();
	const { items, additionals } = useLocalData();
	const { grandTotal, totalAfterDisc } = useSummary();
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
						<ItemComponent {...item} index={i} key={i} mode={mode} item={item} fix={fix} />
					))}
					{additionals.length > 0 ? (
						<div className="self-end w-[410px] justify-between flex gap-2">
							<p>Subtotal:</p>
							<p className="font-bold">Rp{totalAfterDisc.toLocaleString("id-ID")}</p>
							<div className="w-[50px]" />
						</div>
					) : null}
					{additionals.map((add, i) => (
						<AdditionalItem
							index={i}
							key={i}
							mode={mode}
							fix={fix}
							additional={add}
							totalBeforeTax={totalAfterDisc}
						/>
					))}
				</div>
			</div>
			<div className="flex flex-col gap-2 pb-6">
				<p className="font-bold text-5xl">Total:</p>
				<p className="text-9xl text-center">Rp{grandTotal.toLocaleString("id-ID")}</p>
			</div>
		</div>
	);
}
