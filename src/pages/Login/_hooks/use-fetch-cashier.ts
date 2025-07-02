import { useCallback } from "react";
import { Database } from "~/database";
import { useFetch } from "~/hooks/useFetch";

export function useFetchCashiers(context: { db: Database }) {
	const fetch = useCallback(() => context.db.cashier.get.all(), []);
	const [state] = useFetch(fetch);
	return state;
}
