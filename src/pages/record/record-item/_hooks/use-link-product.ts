import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";
import { ProductResult, useProductSearch } from "~/hooks/useProductSearch";

export function useLinkProduct(
	item: DB.RecordItem,
	products: DB.Product[],
	revalidate: () => void,
	context: { db: Database }
) {
	const [query, setQuery] = useState("");
	const db = context.db;
	const { search } = useProductSearch(products);
	const [shown, setShown] = useState<ProductResult[]>([]);
	const selected =
		item.product_id === null ? undefined : products.find((p) => p.id === item.product_id);
	const { loading, action, error, setError } = useAction(
		"",
		(data: { itemId: number; productId: number }) =>
			db.recordItem.update.productId(
				data.itemId,
				selected !== undefined && selected.id === data.productId ? null : data.productId
			)
	);
	const debounced = useDebouncedCallback((value: string) => {
		if (value.trim() === "") {
			setShown([]);
		} else {
			const results = search(value.trim(), {
				fuzzy: (term) => {
					if (term.split(" ").length === 1) {
						return 0.1;
					} else {
						return 0.2;
					}
				},
				prefix: true,
				combineWith: "AND",
			});
			setShown(results);
		}
	}, 500);
	const handleClick = (itemId: number, productId: number) => async () => {
		const errMsg = await action({ itemId, productId });
		if (errMsg) {
			setError(errMsg);
			return;
		}
		setError("");
		revalidate();
	};
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.currentTarget.value;
		setQuery(val);
		debounced(val);
	};
	return { query, handleChange, shown, handleClick, loading, error, selected };
}
