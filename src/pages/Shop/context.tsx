import { createContext, useContext } from "react";
import type { Additional, ItemWithoutDisc } from "./schema";

const Context = createContext<null | {
	item: ItemWithoutDisc | null;
	additional: Additional | null;
  fix: number;
	setItem: (item: ItemWithoutDisc | null) => void;
	setAdditional: (additional: Additional | null) => void;
  setFix: (mode: "buy" | "sell", fix: number) => void;
}>(null);

export const Provider = Context.Provider;

export function useItem() {
	const context = useContext(Context);
	if (context === null) {
		throw new Error("Outside the shop");
	}
	return { item: context.item, setItem: context.setItem };
}

export function useAdditional() {
	const context = useContext(Context);
	if (context === null) {
		throw new Error("Outside the shop");
	}
	return { additional: context.additional, setAdditional: context.setAdditional };
}

export function useFix() {
	const context = useContext(Context);
	if (context === null) {
		throw new Error("Outside the shop");
	}
	return { fix: context.fix, setFix: context.setFix };
}