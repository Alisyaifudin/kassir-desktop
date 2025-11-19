import { store } from "@simplestack/store";
import { useStoreValue } from "@simplestack/store/react";
import { Database } from "~/database";

export const dbStore = store<null | Database>(null);

export const useDB = () => {
	const v = useStoreValue(dbStore);
	if (v === null) throw new Error("DB is null");
	return v;
};
