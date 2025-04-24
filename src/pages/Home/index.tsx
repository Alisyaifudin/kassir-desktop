import { useReducer } from "react";
import { InputItem } from "./Input-Item";
import { ListItem } from "./ListItem";
import { ItemContextProvider } from "./reducer";
import { RouteObject, SetURLSearchParams, useSearchParams } from "react-router";
import { itemReducer } from "./reducer";
import { z } from "zod";

export const route: RouteObject = { index: true, Component: Page };

export default function Page() {
	const [search, setSearch] = useSearchParams();
	const mode = getMode(search);
	const [state, dispatch] = useReducer(itemReducer, { items: [], taxes: [] });
	const reset = () => dispatch({ action: "reset" });
	return (
		<main className="flex gap-2 p-2 h-[calc(100dvh-400px)]">
			<ItemContextProvider value={{ state, dispatch, mode }}>
				<ListItem mode={mode} setMode={setMode(setSearch, reset)} />
				<InputItem />
			</ItemContextProvider>
		</main>
	);
}

function getMode(search: URLSearchParams): "sell" | "buy" {
	const parsed = z.enum(["sell", "buy"]).safeParse(search.get("mode"));
	const mode = parsed.success ? parsed.data : "sell";
	return mode;
}

function setMode(setSearch: SetURLSearchParams, reset: () => void) {
	return function (mode: "sell" | "buy") {
		setSearch({ mode });
		reset();
	};
}
