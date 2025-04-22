import { X } from "lucide-react";
import { cn } from "../../utils";

export type Item = {
	name: string;
	price: string;
	qty: number;
	disc: {
		value: number;
		type: "number" | "percent";
	};
};

export function ItemComponent({ disc, name, price, qty, no }: Item & { no: number }) {
	return (
		<div
			className={cn("grid grid-cols-[50px_1fr_100px_180px_50px_100px_25px] gap-1", {
				"bg-muted": no % 2 == 0,
			})}
		>
			<p className="text-center">{no}</p>
			<input type="text" value={name}></input>
			<input type="number" value={price}></input>
			<div className="flex gap-1">
				<input type="number" className="w-[89px] px-1" value={disc.value} />
				<select
					value={disc.type}
					onChange={(e) => {
						// setDisc(e.currentTarget.value);
					}}
					className=" w-[70px] outline"
				>
					<option value="number">Angka</option>
					<option value="percent">Persen</option>
				</select>
			</div>
			<input type="number" value={qty}></input>
			<p>250.000</p>
			<div className="py-0.5 flex items-center">
				<button className="bg-red-500 text-white">
					<X />
				</button>
			</div>
		</div>
	);
}
