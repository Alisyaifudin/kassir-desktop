import { Lock, X } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { Item } from "../schema";
import { SetItem } from "./useLocalStorage";
import { Discount } from "./Discount";
import { calcSubtotal } from "./submit";
import { Fragment } from "react";

type Props = {
	index: number;
	mode: "sell" | "buy";
	item: Item;
	set: SetItem;
	fix: number;
};

export function ItemComponent({
	index,
	mode,
	item: { id, discs, name, price, qty, stock, barcode },
	set,
	fix,
}: Props) {
	const { total: subtotal } = calcSubtotal(discs, price, qty, fix);
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
		if (id !== undefined || isNaN(val) || val < 0) {
			return;
		}
		set.price(mode, index, val);
	};
	const handleChangeQty = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = Number(e.currentTarget.value);
		console.log(val);
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
	const handleDelete = () => set.delete(mode, index);
	return (
		<div
			className={cn("grid grid-cols-[70px_1fr] items-center text-3xl py-0.5", {
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
					<input
						type="text"
						value={name}
						className="px-0.5 outline"
						onChange={handleChangeName}
					></input>
				) : (
					<p>{name}</p>
				)}
				<div className="grid gap-1 grid-cols-[1fr_150px_230px_70px_150px_50px]">
					{id === undefined ? (
						<input
							type="text"
							value={barcode ?? ""}
							className="px-0.5 border-b border-l border-r"
							onChange={handleChangeBarcode}
						></input>
					) : (
						<p>{barcode ?? ""}</p>
					)}
					{id === undefined || mode === "buy" ? (
						<input
							type="number"
							className={cn("px-0.5", id !== undefined ? "outline" : "border-b border-l border-r")}
							value={price === 0 ? "" : price}
							onChange={handleChangePrice}
							step={1 / Math.pow(10, fix)}
						></input>
					) : (
						<p>{price}</p>
					)}
					<Discount
						discs={discs}
						itemIndex={index}
						mode={mode}
						setDisc={set.disc}
						qty={qty}
						price={price}
						fix={fix}
					/>
					<input
						type="number"
						className={cn("px-0.5", id !== undefined ? "outline" : "border-b border-l border-r")}
						value={qty === 0 ? "" : qty}
						onChange={handleChangeQty}
						pattern="[1-9][0-9]*"
					></input>
					<p>{subtotal.toNumber().toLocaleString("id-ID")}</p>
					<div className="py-0.5 flex items-center">
						<button onClick={handleDelete} className="bg-red-500 text-white">
							<X size={35} />
						</button>
					</div>
				</div>
				{discs.length === 0
					? null
					: discs.map((disc, i) => (
							<Fragment key={i}>
								<div className="grid grid-cols-[1fr_80px_150px_270px] gap-1 ">
									<div />
									<p>Diskon</p>
									<p className="text-end">
										{disc.type === "percent"
											? `${disc.value}%`
											: disc.value.toLocaleString("id-ID")}
									</p>
									<div />
								</div>
							</Fragment>
					  ))}
			</div>
		</div>
	);
}
