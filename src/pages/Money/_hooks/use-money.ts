import { useCallback } from "react";
import { Database } from "~/database";
import { useFetch } from "~/hooks/useFetch";

export function useMoney(time: number, start: number, end: number, db: Database) {
	const fetch = useCallback(() => db.money.get.byRange(start, end), [start, end, time])
	return useFetch(fetch);
}
