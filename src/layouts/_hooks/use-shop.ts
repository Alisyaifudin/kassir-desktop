import { useCallback } from "react";
import { Size } from "~/hooks/use-size";
import { useFetch } from "~/hooks/useFetch";
import { Store } from "~/lib/store";
import { tryResult } from "~/lib/utils";

export function useShop(store: Store) {
	const fetch = useCallback(
		() =>
			tryResult({
				run: async () => {
					const [name, size] = await Promise.all([
						store.profile.owner.get(),
						store.profile.size.get(),
					]);
					let s: Size = "big";
					if (size !== "big" && size !== "small") {
						s = "big";
					} else {
						s = size;
					}
					return { name: name ?? "Toko", size: s };
				},
			}),
		[]
	);
	return useFetch(fetch);
}
