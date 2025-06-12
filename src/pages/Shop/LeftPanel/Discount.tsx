import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Plus, X } from "lucide-react";
import { Fragment, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { produce } from "immer";
import { z } from "zod";
import { numeric } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { calcSubtotal } from "../submit";
import { Button } from "~/components/ui/button";
import { useSetData } from "../context";

export function Discount({
	discs,
	itemIndex,
	mode,
	price,
	qty,
	fix,
}: {
	discs: {
		value: number;
		type: "number" | "percent";
	}[];
	itemIndex: number;
	mode: "sell" | "buy";
	price: number;
	qty: number;
	fix: number;
}) {
	const { items: set } = useSetData();
	const [val, setVal] = useState(discs);
	const { discount } = calcSubtotal(val, price, qty, fix);
	const debouncedType = useDebouncedCallback((index: number, type: "percent" | "number") => {
		set.disc.kind(mode, itemIndex, index, type);
	}, 1000);
	const handleChangeType = (index: number) => (e: React.ChangeEvent<HTMLSelectElement>) => {
		const parsed = z.enum(["percent", "number"]).safeParse(e.currentTarget.value);
		const type = parsed.success ? parsed.data : "percent";
		setVal((state) =>
			produce(state, (draft) => {
				draft[index].type = type;
				switch (type) {
					case "percent":
						if (draft[index].value > 100) {
							draft[index].value = 100;
						}
						break;
					case "number":
						if (draft[index].value > price * qty) {
							draft[index].value = price * qty;
						}
				}
			})
		);
		debouncedType(index, type);
	};
	const debouncedVal = useDebouncedCallback((index: number, value: number) => {
		set.disc.value(mode, itemIndex, index, value);
	}, 1000);
	const handleChangeValue = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
		const parsed = numeric.safeParse(e.currentTarget.value);
		let value = parsed.success ? parsed.data : 0;
		if (value < 0) {
			return;
		}
		if (value > price * qty && val[index].type === "number") {
			value = price * qty;
		}
		setVal((state) =>
			produce(state, (draft) => {
				if (draft[index].type === "percent") {
					draft[index].value = value > 100 ? 100 : value;
				} else {
					draft[index].value = value;
				}
			})
		);
		debouncedVal(index, value);
	};
	const handleDelete = (index: number) => () => {
		setVal((state) => state.filter((_, i) => i !== index));
		set.disc.delete(mode, itemIndex, index);
	};
	const handleAdd = () => {
		setVal([...val, { type: "percent", value: 0 }]);
		set.disc.add(mode, itemIndex);
	};
	return (
		<Dialog>
			<div className="flex items-center justify-between px-1 gap-1">
				<p className="text-3xl">{discount.toNumber().toLocaleString("id-ID")}</p>
				<DialogTrigger>
					<Plus className="outline" />
				</DialogTrigger>
			</div>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="text-3xl">Diskon</DialogTitle>
				</DialogHeader>
				<div className="grid grid-cols-[1fr_110px_50px] gap-1 text-3xl items-center">
					{val.map((v, i) => (
						<Fragment key={i}>
							<Input
								type="number"
								value={v.value === 0 ? "" : v.value}
								onChange={handleChangeValue(i)}
							></Input>
							<select value={v.type} onChange={handleChangeType(i)} className=" w-[110px] border">
								<option value="number">Angka</option>
								<option value="percent">Persen</option>
							</select>
							<button onClick={handleDelete(i)} className="bg-red-500 w-fit h-fit text-white">
								<X size={35} />
							</button>
						</Fragment>
					))}
				</div>
				<DialogFooter>
					<Button onClick={handleAdd}>Tambahkan Diskon</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
