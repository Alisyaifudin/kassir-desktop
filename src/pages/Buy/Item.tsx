import { X } from "lucide-react";
import { cn } from "../../utils";
import { useContext } from "react";
import { ItemContext } from "./reducer";
import { calcSubtotal } from "./submit";

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
	index: number;
} & Item;

// stock later
export function ItemComponent({ id, disc, name, price, qty, index }: Props) {
	const { dispatch } = useContext(ItemContext);
	return (
		<div
			className={cn("grid grid-cols-[50px_1fr_100px_170px_50px_100px_25px] gap-1 items-center", {
				"bg-muted": index % 2 == 0,
			})}
		>
			<div className="flex justify-center items-center">
				<p className="text-center">{index + 1}</p>
			</div>
			{id !== undefined ? (
				<p>{name}</p>
			) : (
				<input
					type="text"
					value={name}
					className="px-0.5"
					onChange={(e) => dispatch({ action: "edit-name", index, name: e.currentTarget.value })}
				></input>
			)}
			{id !== undefined ? (
				<p>{Number(price).toLocaleString("de-DE")}</p>
			) : (
				<input
					type="number"
					className="px-0.5"
					value={price}
					onChange={(e) => dispatch({ action: "edit-price", index, price: e.currentTarget.value })}
				></input>
			)}
			<div className="flex gap-1">
				<input
					type="number"
					className="w-[93px] px-1"
					value={disc.value}
					onChange={(e) =>
						dispatch({ action: "edit-disc-val", index, value: e.currentTarget.value })
					}
				/>
				<select
					value={disc.type}
					onChange={(e) =>
						dispatch({ action: "edit-disc-type", index, type: e.currentTarget.value })
					}
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
				onChange={(e) => dispatch({ action: "edit-qty", index, qty: e.currentTarget.value })}
			></input>
			<p>{calcSubtotal(disc, price, qty).toNumber().toLocaleString("id-ID")}</p>
			<div className="py-0.5 flex items-center">
				<button
					onClick={() => dispatch({ action: "delete", index })}
					className="bg-red-500 text-white"
				>
					<X />
				</button>
			</div>
		</div>
	);
}
