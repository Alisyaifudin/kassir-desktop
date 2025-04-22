import Decimal from "decimal.js";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { calcSubtotal, Item, ItemComponent } from "./Item";
import { useContext, useState } from "react";
import { cn } from "../../utils";
import { ItemContext } from "./item-method";

export function ListItem() {
	const { items } = useContext(ItemContext);
	const [pay, setPay] = useState("");
	const [disc, setDisc] = useState<{ type: "number" | "percent"; value: string }>({
		type: "number",
		value: "",
	});
	const rawTotal = calcRawTotal(items);
	const total = calcTotal(rawTotal, disc);
	const change = calcChange(total, pay).toNumber();
	const editPay = (value: string) => {
		if (Number.isNaN(value) || Number(value) < 0 || Number(value) >= 1e9) {
			return;
		}
		setPay(value);
	};
	const editTotalDiscVal = (value: string) => {
		if (
			Number.isNaN(value) ||
			Number(value) < 0 ||
			(disc.type === "number" && Number(value) >= 1e9) ||
			(disc.type === "percent" && Number(value) > 100)
		) {
			return;
		}
		setDisc((prev) => ({
			...prev,
			value,
		}));
	};
	const editTotalDiscType = (type: string) => {
		if (type !== "number" && type !== "percent") {
			return;
		}
		let value = disc.value;
		if (type === "percent" && Number(value) > 100) {
			value = "100";
		}
		setDisc({ value, type });
	};
	return (
		<div className="border-r flex-1 flex flex-col gap-2">
			<div className="outline h-full flex-1 p-1 flex flex-col gap-1 overflow-y-auto">
				<h1 className="text-2xl font-bold">Barang</h1>
				<div className="grid grid-cols-[50px_1fr_100px_170px_50px_100px_25px] gap-1 outline">
					<p className="border-r">No.</p>
					<p className="border-r">Nama</p>
					<p className="border-r">Harga</p>
					<p className="border-r">Diskon</p>
					<p className="border-r">Qty</p>
					<p>Subtotal</p>
					<div />
				</div>
				<div className="flex flex-col overflow-y-auto">
					{items.map((item, i) => (
						<ItemComponent {...item} index={i} key={i} />
					))}
				</div>
			</div>
			<div className="flex items-center pr-1 h-[150px] gap-2">
				<div className="flex flex-col gap-2 flex-1  h-full items-center">
					<p className="font-bold">Total:</p>
					<p className="text-7xl">Rp{total.toNumber().toLocaleString("de-DE")}</p>
				</div>
				<div className="flex-1 flex flex-col gap-1 h-full">
					<label className="grid grid-cols-[90px_1fr] items-center">
						<span>Bayar:</span>
						<Input type="number" value={pay} onChange={(e) => editPay(e.currentTarget.value)} />
					</label>
					<div className="flex gap-2">
						<label className="grid grid-cols-[90px_1fr] items-center flex-1">
							<span>Diskon:</span>
							<Input
								type="number"
								value={disc.value}
								onChange={(e) => editTotalDiscVal(e.currentTarget.value)}
							/>
						</label>
						<select
							value={disc.type}
							onChange={(e) => editTotalDiscType(e.currentTarget.value)}
							className=" w-[70px] outline"
						>
							<option value="number">Angka</option>
							<option value="percent">Persen</option>
						</select>
					</div>
					<div className="grid grid-cols-[91px_1fr] h-[30px] items-center">
						<p>Kembalian:</p>
						<p className={cn({ "bg-red-500 text-white px-1": change < 0 })}>
							{change.toLocaleString("de-DE")}
						</p>
					</div>
					<Button disabled={change < 0}>Bayar</Button>
				</div>
			</div>
			<div></div>
		</div>
	);
}

const calcRawTotal = (items: Item[]): Decimal => {
	let total = new Decimal(0);
	for (const item of items) {
		const subtotal = calcSubtotal(item.disc, item.price, item.qty);
		total = total.add(subtotal);
	}
	return total;
};

function calcTotal(total: Decimal, disc: { type: "number" | "percent"; value: string }): Decimal {
	const discVal = disc.value === "" ? 0 : disc.value;
	if (disc.type === "number") {
		return total.sub(discVal);
	}
	const val = total.times(discVal).div(100);
	return total.sub(val);
}

function calcChange(total: Decimal, pay: string): Decimal {
	return new Decimal(pay === "" ? 0 : pay).sub(total);
}
