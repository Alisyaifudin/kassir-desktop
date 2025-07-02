import { Database } from "~/database";
import { useFetch } from "./useFetch";
import { useCallback } from "react";

// export const FETCH_METHODS = "fetch-method";

export function useFetchMethods(db: Database) {
	const fetch = useCallback(() => db.method.get.all(), []);
	return useFetch(fetch);
}
