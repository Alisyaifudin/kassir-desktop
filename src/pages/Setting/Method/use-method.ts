import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";
import { METHODS } from "~/lib/utils";

export function useMethod() {
	const [search, setSearch] = useSearchParams();
	const method = useMemo(() => {
		const method = z.enum(METHODS).catch("transfer").parse(search.get("method"));
		return method;
	}, [search]);
	const setMethod = (method: DB.MethodEnum) => setSearch({ method });
	return [method, setMethod] as const;
}
