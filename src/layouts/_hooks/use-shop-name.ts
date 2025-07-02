import { useCallback } from "react";
import { useFetch } from "~/hooks/useFetch";
import { Store } from "~/lib/store";
import { tryResult } from "~/lib/utils";

export function useShopName(store: Store) {
	const fetch = useCallback(
		() =>
			tryResult({
				run: async () => {
					const name = await store.profile.owner.get();
					return name ?? "Toko";
				},
			}),
		[]
	);
	return useFetch(fetch);
}
