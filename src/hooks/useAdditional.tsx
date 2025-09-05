import { Database } from "~/database";
import { useFetch } from "./useFetch";
import { useCallback } from "react";

export function useAdditionals(context: { db: Database }) {
	const db = context.db;
	const fetch = useCallback(() => db.additionalItem.get.all(), []);
	const [state] = useFetch(fetch);
	return state;
}
