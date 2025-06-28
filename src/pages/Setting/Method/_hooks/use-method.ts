import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";
import { useAsync } from "~/hooks/useAsync";
import { METHODS } from "~/lib/utils";
import { useDB } from "~/RootLayout";

export const FETCH_METHOD = 'fetch-method';

export function useMethod() {
  const db = useDB();
	const [search, setSearch] = useSearchParams();
	const method = useMemo(() => {
		const method = z.enum(METHODS).catch("transfer").parse(search.get("method"));
		return method;
	}, [search]);
	const setMethod = (method: DB.MethodEnum) => setSearch({ method });
  const state = useAsync(() => db.method.get(), [FETCH_METHOD]);
	return { method, setMethod, state };
}
