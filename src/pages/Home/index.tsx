import { useState } from "react";
import { InputItem } from "./InputItem";
import { ListItem } from "./ListItem";
import { Item } from "./Item";
import { ItemContextProvider } from "./item-method";


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
	return (
		<main className="flex gap-2 p-2 h-[calc(100vh-60px)]">
			<ItemContextProvider value={{items, setItems}}>
				<ListItem />
				<InputItem />
			</ItemContextProvider>
		</main>
	);
}
