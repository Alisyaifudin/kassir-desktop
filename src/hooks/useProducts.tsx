import { Database } from "~/database";
import { useFetch } from "./useFetch";
import { useCallback } from "react";

export function useProducts(context: { db: Database }) {
	const db = context.db;
	const fetch = useCallback(() => db.product.get.all(), []);
	const [state] = useFetch(fetch);
	return state;
}
