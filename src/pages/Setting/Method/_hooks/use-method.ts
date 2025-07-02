import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";
import { METHODS } from "~/lib/utils";
import { Database } from "~/database";
import { useFetch } from "~/hooks/useFetch";

export function useMethod(db: Database) {
	const [search, setSearch] = useSearchParams();
	const method = useMemo(() => {
		const method = z.enum(METHODS).catch("transfer").parse(search.get("method"));
		return method;
	}, [search]);
	const setMethod = (method: DB.MethodEnum) => setSearch({ method });
	const fetch = useCallback(() => db.method.get.all(), []);
	const [state, revalidate] = useFetch(fetch);
	return { method, setMethod, state, revalidate };
}
