import { useReducer } from "react";
import { InputItem } from "./Input-Item";
import { ListItem } from "./ListItem";
import { ItemContextProvider } from "./reducer";
import { RouteObject } from "react-router";
import { itemReducer } from "./reducer";

export const route: RouteObject = { index: true, Component: Page };

export default function Page() {
	const [items, dispatch] = useReducer(itemReducer, []);
	return (
		<main className="flex gap-2 p-2 h-[calc(100dvh-400px)]">
			<ItemContextProvider value={{ items, dispatch }}>
				<ListItem />
				<InputItem />
			</ItemContextProvider>
		</main>
	);
}
