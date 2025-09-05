import { useCallback } from "react";
import { Database } from "~/database";
import { useFetch } from "~/hooks/useFetch";

export const useItem = (id: number, db: Database) => {
	const fetchItem = useCallback(() => db.additionalItem.get.byId(id), []);
	const [item] = useFetch(fetchItem);
	return item
};
