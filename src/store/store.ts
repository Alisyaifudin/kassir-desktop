import { store } from "@simplestack/store";
import { useStoreValue } from "@simplestack/store/react";
import { Store } from "~/lib/store";

export const storeStore = store<null | Store>(null);

export const useStore = () => {
	const v = useStoreValue(storeStore);
	if (v === null) throw new Error("Store is null");
	return v;
};
