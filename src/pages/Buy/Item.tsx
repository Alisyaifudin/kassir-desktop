import { X, Lock } from "lucide-react";
import { cn } from "../../utils";
import Decimal from "decimal.js";
import { useContext } from "react";
import { ItemContext, itemMethod } from "./item-method";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { useDb } from "../../Layout";

export type Item = {
	id?: number;
	name: string;
	price: string;
	qty: string;
	disc: {
		value: string;
		type: "number" | "percent";
	};
	barcode: string | null;
};

type Props = {
	index: number;
} & Item;

export function ItemComponent({ id, disc, name, price, qty, index, barcode }: Props) {
	const { setItems } = useContext(ItemContext);
	const db = useDb();
	const { editName, deleteItem, editDiscType, editDiscVal, editPrice, editQty } =
		itemMethod(db, setItems);
	return (
		<div
			className={cn("grid grid-cols-[50px_150px_1fr_100px_170px_50px_100px_25px] gap-1 items-center", {
				"bg-muted": index % 2 == 0,
			})}
		>
			<div className="flex justify-center items-center">
				<p className="text-center">{index + 1}</p>
				{id === undefined ? null : (
					<Popover>
						<PopoverTrigger>
							<Lock size={15} />
						</PopoverTrigger>
						<PopoverContent align="end" className="w-24">
							<p>id: {id}</p>
						</PopoverContent>
					</Popover>
				)}
			</div>
			<p>{barcode ?? ""}</p>
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
