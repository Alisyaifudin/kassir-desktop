import { useState } from "react";
import { InputItem } from "./InputItem";
import { ListItem } from "./ListItem";
import { Item } from "./Item";

export default function Page() {
	const [items, setItems] = useState<Item[]>([
		{
			disc: {
				type: "number",
				value: "0",
			},
			name: "Semangka",
			price: "10000",
			qty: "1",
		},
		{
			id: 1,
			disc: {
				type: "number",
				value: "0",
			},
			name: "Apel",
			price: "15000",
			qty: "3",
		},
	]);
	const deleteItem = (index: number) => {
		setItems((prev) => prev.filter((_, i) => i !== index));
	};
	const editName = (index: number, name: string) => {
		setItems((prev) => {
			return prev.map((item, i) =>
				i === index
					? {
							...item,
							name,
					  }
					: item
			);
		});
	};
	const editPrice = (index: number, price: string) => {
		if (Number.isNaN(price) || Number(price) < 0 || Number(price) > 1e9) {
			return;
		}
		setItems((prev) => {
			return prev.map((item, i) =>
				i === index
					? {
							...item,
							price,
					  }
					: item
			);
		});
	};
	const editQty = (index: number, qty: string) => {
		if (
			Number.isNaN(qty) ||
			Number(qty) < 0 ||
			Number(qty) >= 10_000 ||
			(items[index].stock !== undefined && Number(qty) > items[index].stock)
		) {
			return;
		}
		setItems((prev) => {
			return prev.map((item, i) =>
				i === index
					? {
							...item,
							qty,
					  }
					: item
			);
		});
	};
	const editDiscVal = (index: number, value: string) => {
		if (Number.isNaN(value)) {
			return;
		}
		if (
			Number(value) < 0 ||
			(items[index].disc.type === "number" && Number(value) >= 1e9) ||
			(items[index].disc.type === "percent" && Number(value) > 100)
		) {
			return;
		}
		setItems((prev) => {
			return prev.map((item, i) =>
				i === index
					? {
							...item,
							disc: {
								...item.disc,
								value,
							},
					  }
					: item
			);
		});
	};
	const editDiscType = (index: number, type: string) => {
		if (type !== "number" && type !== "percent") {
			return;
		}
		let value = items[index].disc.value;
		if (type === "percent" && Number(value) > 100) {
			value = "100";
		}
		setItems((prev) => {
			return prev.map((item, i) =>
				i === index
					? {
							...item,
							disc: {
								value,
								type,
							},
					  }
					: item
			);
		});
	};
	return (
		<main className="flex gap-2 p-2 h-[calc(100vh-60px)]">
			<ListItem
				items={items}
				editName={editName}
				editPrice={editPrice}
				editDiscType={editDiscType}
				editDiscVal={editDiscVal}
				editQty={editQty}
				deleteItem={deleteItem}
			/>
			<InputItem />
		</main>
	);
}
