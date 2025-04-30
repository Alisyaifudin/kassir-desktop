import { Lock, X } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useContext } from "react";
import { ItemContext } from "./reducer";
import { calcSubtotal } from "./submit";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";

export type Item = {
	id?: number;
	stock?: number;
	barcode?: string;
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
	mode: "sell" | "buy";
} & Item;

export function ItemComponent({ id, disc, name, price, qty, index, mode, stock, barcode }: Props) {
	const { dispatch } = useContext(ItemContext);
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
					<input
						type="text"
						value={name}
						className="px-0.5"
						onChange={(e) => dispatch({ action: "edit-name", index, name: e.currentTarget.value })}
					></input>
				) : (
					<p>{name}</p>
				)}
				<div className="grid grid-cols-[1fr_150px_230px_85px_150px_50px]">
					{id === undefined ? (
						<input
							type="text"
							value={barcode ?? ""}
							className="px-0.5"
							onChange={(e) =>
								dispatch({ action: "edit-barcode", index, barcode: e.currentTarget.value })
							}
						></input>
					) : (
						<p>{barcode ?? ""}</p>
					)}
					{id === undefined ? (
						<input
							type="number"
							className="px-0.5"
							value={price}
							onChange={(e) =>
								dispatch({ action: "edit-price", index, price: e.currentTarget.value })
							}
						></input>
					) : (
						<p>{price}</p>
					)}
					<div className="flex gap-1">
						<input
							type="number"
							className="w-full px-1"
							value={disc.value}
							step={disc.type === "number" ? 1 : 0.01}
							onChange={(e) =>
								dispatch({ action: "edit-disc-val", index, value: e.currentTarget.value })
							}
						/>
						<select
							value={disc.type}
							onChange={(e) =>
								dispatch({ action: "edit-disc-type", index, type: e.currentTarget.value })
							}
							className=" w-[110px] border"
						>
							<option value="number">Angka</option>
							<option value="percent">Persen</option>
						</select>
					</div>
					<input
						type="number"
						className="px-0.5"
						value={qty}
						onChange={(e) =>
							dispatch({ action: "edit-qty", index, qty: e.currentTarget.value, mode })
						}
					></input>
					<p>{calcSubtotal(disc, price, qty).toNumber().toLocaleString("id-ID")}</p>
					<div className="py-0.5 flex items-center">
						<button
							onClick={() => dispatch({ action: "delete", index })}
							className="bg-red-500 text-white"
						>
							<X size={35} />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
