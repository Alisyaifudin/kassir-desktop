import { useCallback } from "react";
import { Database } from "~/database";
import { useFetch } from "~/hooks/useFetch";

export function useCashier(db: Database) {
	const fetch = useCallback(() => db.cashier.get.all(), []);
	return useFetch(fetch);
}
