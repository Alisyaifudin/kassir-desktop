import { useCallback } from "react";
import { Database } from "~/database";
import { useFetch } from "~/hooks/useFetch";

export function useCustomer(db: Database) {
	const fetch = useCallback(() => db.customer.get.all(), []);
	return useFetch(fetch);
}
