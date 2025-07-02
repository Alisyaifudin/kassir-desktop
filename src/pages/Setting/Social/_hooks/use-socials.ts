import { useCallback } from "react";
import { Database } from "~/database";
import { useFetch } from "~/hooks/useFetch";

export function useSocials(db: Database) {
	const fetch = useCallback(() => db.social.get.all(), []);
	return useFetch(fetch);
}
