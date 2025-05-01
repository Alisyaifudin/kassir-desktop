import { Lock, X } from "lucide-react";
import { cn } from "../../../lib/utils";
import { calcSubtotal } from "./submit";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { Item } from "../schema";
import { z } from "zod";
import { SetItem } from "./useLocalStorage";

type Props = {
	index: number;
	mode: "sell" | "buy";
	item: Item;
	set: SetItem;
};

export function ItemComponent({
	index,
	mode,
	item: { id, disc, name, price, qty, stock, barcode },
	set,
}: Props) {
	const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (id !== undefined) {
			return;
		}
		set.name(mode, index, e.currentTarget.value);
	};
	const handleChangeBarcode = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (id !== undefined) {
			return;
		}
		const val = e.currentTarget.value === "" ? null : e.currentTarget.value.trim();
		set.barcode(mode, index, val);
	};
	const handleChangePrice = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = Number(e.currentTarget.value);
		if (id !== undefined || isNaN(val)) {
			return;
		}
		set.price(mode, index, val);
	};
	const handleChangeQty = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = Number(e.currentTarget.value);
		if (
			isNaN(val) ||
			!Number.isInteger(val) ||
			val < 0 ||
			(mode === "sell" && stock && val > stock)
		) {
			return;
		}
		set.qty(mode, index, val);
	};
	const handleChangeDiscType = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const parsed = z.enum(["percent", "number"]).safeParse(e.currentTarget.value);
		if (!parsed.success) {
			return;
		}
		const val = parsed.data;
		if (val === "percent" && disc.value > 100) {
			set.discVal(mode, index, 100);
		}
		set.discType(mode, index, val);
	};
	const handleChangeDiscVal = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = Number(e.currentTarget.value);
		if (isNaN(val) || val < 0 || (disc.type === "number" && !Number.isInteger(val))) {
			return;
		}
		set.discVal(mode, index, val);
	};
	const handleDelete = () => set.delete(mode, index);
	return (
		<div
			className={cn("grid gap-1 grid-cols-[70px_1fr] items-center text-3xl", {
				"bg-muted": index % 2 == 0,
			})}
		>
			<div className="flex justify-center items-center">
				{id === undefined ? (
					<p className="text-center">{index + 1}</p>
				) : (
					<Popover>
						<PopoverTrigger className="flex items-center">
							<p className="text-center">{index + 1}</p>
							<Lock />
						</PopoverTrigger>
						<PopoverContent className="flex flex-col text-2xl w-fit">
							<p>Id: {id}</p>
							<p>Stok: {stock}</p>
						</PopoverContent>
					</Popover>
				)}
			</div>
			<div className="flex flex-col">
				{id === undefined ? (
					<input type="text" value={name} className="px-0.5" onChange={handleChangeName}></input>
				) : (
					<p>{name}</p>
				)}
				<div className="grid grid-cols-[1fr_150px_230px_85px_150px_50px]">
					{id === undefined ? (
						<input
							type="text"
							value={barcode ?? ""}
							className="px-0.5"
							onChange={handleChangeBarcode}
						></input>
					) : (
						<p>{barcode ?? ""}</p>
					)}
					{id === undefined ? (
						<input
							type="number"
							className="px-0.5"
							value={price === 0 ? "" : price}
							onChange={handleChangePrice}
						></input>
					) : (
						<p>{price}</p>
					)}
					<div className="flex gap-1">
						<input
							type="number"
							className="w-full px-1"
							value={disc.value === 0 ? "" : disc.value}
							step={disc.type === "number" ? 1 : 0.00001}
							onChange={handleChangeDiscVal}
						/>
						<select value={disc.type} onChange={handleChangeDiscType} className=" w-[110px] border">
							<option value="number">Angka</option>
							<option value="percent">Persen</option>
						</select>
					</div>
					<input
						type="number"
						className="px-0.5"
						value={qty === 0 ? "" : qty}
						onChange={handleChangeQty}
						pattern="[1-9][0-9]*"
					></input>
					<p>{calcSubtotal(disc, price, qty).toNumber().toLocaleString("id-ID")}</p>
					<div className="py-0.5 flex items-center">
						<button onClick={handleDelete} className="bg-red-500 text-white">
							<X size={35} />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
