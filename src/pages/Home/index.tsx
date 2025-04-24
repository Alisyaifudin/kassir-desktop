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
	const variant = getVar(search);
	const [state, dispatch] = useReducer(itemReducer, { items: [], taxes: [] });
	const reset = () => dispatch({action: "reset"});
	return (
		<main className="flex gap-2 p-2 h-[calc(100dvh-400px)]">
			<ItemContextProvider value={{ state, dispatch, variant }}>
				<ListItem variant={variant} setVar={setVar(setSearch, reset)} />
				<InputItem />
			</ItemContextProvider>
		</main>
	);
}

function getVar(search: URLSearchParams): "sell" | "buy" {
	const parsed = z.enum(["sell", "buy"]).safeParse(search.get("variant"));
	const variant = parsed.success ? parsed.data : "sell";
	return variant;
}

function setVar(setSearch: SetURLSearchParams, reset: ()=> void) {
	return function (variant: "sell" | "buy") {
		setSearch({ variant });
		reset();
	};
}
