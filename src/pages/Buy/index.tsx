import { useState } from "react";
import { InputItem } from "./InputItem";
import { ListItem } from "./ListItem";
import { Item } from "./Item";
import { ItemContextProvider } from "./item-method";
import { RouteObject } from "react-router";

export const route: RouteObject = {
	Component: Page,
	path: "/buy",
};

export default function Page() {
	const [items, setItems] = useState<Item[]>([]);
	return (
		<main className="flex gap-2 p-2 h-[calc(100dvh-400px)]">
			<ItemContextProvider value={{ items, setItems }}>
				<ListItem />
				<InputItem />
			</ItemContextProvider>
		</main>
	);
}

// {
// 	disc: {
// 		type: "number",
// 		value: "0",
// 	},
// 	name: "Semangka",
// 	price: "10000",
// 	qty: "1",
// },
// {
// 	id: 1,
// 	stock: 20,
// 	disc: {
// 		type: "number",
// 		value: "0",
// 	},
// 	name: "Apel",
// 	price: "15000",
// 	qty: "3",
// },
