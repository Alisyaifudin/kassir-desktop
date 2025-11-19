import { useCallback } from "react";
import { useFetch } from "~/hooks/useFetch";
import { Store } from "~/lib/store";
import { tryResult } from "~/lib/utils";

export function useStoreInfo(store: Store) {
	const fetch = useCallback(async () => {
		const s = await tryResult({
			run: async () => {
				const all = await store.all();
				return { ...all, owner: all.owner || "Toko" };
			},
		});
		return s;
	}, []);
	return useFetch(fetch);
}
