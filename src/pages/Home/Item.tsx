import { X, Lock } from "lucide-react";
import { cn } from "../../utils";
import Decimal from "decimal.js";

export type Item = {
	id?: number;
	stock?: number;
	name: string;
	price: string;
	qty: string;
	disc: {
		value: string;
		type: "number" | "percent";
	};
};

type Props = {
	editName: (index: number, name: string) => void;
	editPrice: (index: number, price: string) => void;
	editDiscVal: (index: number, value: string) => void;
	editDiscType: (index: number, type: string) => void;
	editQty: (index: number, qty: string) => void;
	deleteItem: (index: number) => void;
	index: number;
} & Item;

export function ItemComponent({
	id,
	disc,
	name,
	price,
	qty,
	index,
	editName,
	editPrice,
	editDiscType,
	editDiscVal,
	editQty,
	deleteItem,
}: Props) {
	return (
		<div
			className={cn("grid grid-cols-[50px_1fr_100px_170px_50px_100px_25px] gap-1 items-center", {
				"bg-muted": index % 2 == 0,
			})}
		>
			<div className="flex justify-center items-center">
				<p className="text-center">{index + 1}</p>
				{id === undefined ? null : <Lock size={15} />}
			</div>
			{id !== undefined ? (
				<p>{name}</p>
			) : (
				<input
					type="text"
					value={name}
					className="px-0.5"
					onChange={(e) => editName(index, e.currentTarget.value)}
				></input>
			)}
			{id !== undefined ? (
				<p>{Number(price).toLocaleString("de-DE")}</p>
			) : (
				<input
					type="number"
					className="px-0.5"
					value={price}
					onChange={(e) => editPrice(index, e.currentTarget.value)}
				></input>
			)}
			<div className="flex gap-1">
				<input
					type="number"
					className="w-[93px] px-1"
					value={disc.value}
					onChange={(e) => editDiscVal(index, e.currentTarget.value)}
				/>
				<select
					value={disc.type}
					onChange={(e) => editDiscType(index, e.currentTarget.value)}
					className=" w-[70px] outline"
				>
					<option value="number">Angka</option>
					<option value="percent">Persen</option>
				</select>
			</div>
			<input
				type="number"
				className="px-0.5"
				value={qty}
				onChange={(e) => editQty(index, e.currentTarget.value)}
			></input>
			<p>{calcSubtotal(disc, price, qty).toNumber().toLocaleString("de-DE")}</p>
			<div className="py-0.5 flex items-center">
				<button onClick={() => deleteItem(index)} className="bg-red-500 text-white">
					<X />
				</button>
			</div>
		</div>
	);
}

export function calcSubtotal(
	disc: {
		value: string;
		type: "number" | "percent";
	},
	price: string,
	qty: string
): Decimal {
	const priceVal = price === "" ? 0 : price;
	const qtyVal = qty === "" ? 0 : qty;
	const total = new Decimal(priceVal).times(qtyVal);
	const discVal = disc.value === "" ? 0 : disc.value;
	if (disc.type === "number") {
		return total.sub(discVal);
	}
	const val = total.times(discVal).div(100);
	return total.sub(val);
}
