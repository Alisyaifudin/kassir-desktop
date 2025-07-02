import { useCallback } from "react";
import { Database } from "~/database";
import { useFetch } from "~/hooks/useFetch";

export const LIMIT = 20;

export function useHistory(id: number, page: number, mode: DB.Mode, db: Database) {
	const fetchHistory = useCallback(
		() => db.product.get.history(id, (page - 1) * LIMIT, LIMIT, mode),
		[page, mode]
	);
	const [history] = useFetch(fetchHistory);
	return history;
}
