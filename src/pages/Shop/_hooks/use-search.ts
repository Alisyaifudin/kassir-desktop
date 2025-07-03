import { useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { ProductResult, useProductSearch } from "~/hooks/useProductSearch";
import { ItemWithoutDisc } from "../_utils/schema";
import { useItems } from "./use-items";
import { LocalContext } from "./use-local-state";
import { DEBOUNCE_DELAY } from "~/lib/constants";

export function useSearch(all: DB.Product[], context: LocalContext) {
	const [query, setQuery] = useState("");
	const ref = useRef<HTMLInputElement>(null);
	const [products, setProducts] = useState<ProductResult[]>([]);
	const [_, setItems] = useItems(context);
	const { search } = useProductSearch(all);
	const debounced = useDebouncedCallback((value: string) => {
		if (value.trim() === "" || query === "") {
			setProducts([]);
		} else {
			const results = search(value.trim().replace(/(\(|\))/g, ""), {
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
			setProducts(results);
		}
	}, DEBOUNCE_DELAY);
	const [error, setError] = useState("");
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.currentTarget.value;
		setQuery(val.trimStart());
		setError("");
		if (val.trim() === "") {
			setProducts([]);
			return;
		}
		debounced(val);
	};
	const handleClick = (item: ItemWithoutDisc) => {
		if (ref.current === null) return;
		setItems.add(item);
		setProducts([]);
		setQuery("");
		setError("");
		ref.current.focus();
	};
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (error !== "" || query.trim() === "") {
			return;
		}
		const product = all.find((p) => p.barcode === query.trim());
		if (product === undefined) {
			setError("Barang tidak ditemukan");
			return;
		}
		handleClick({
			barcode: product.barcode,
			name: product.name,
			price: product.price,
			qty: 1,
			productId: product.id,
			stock: product.stock,
			capital: product.capital,
		});
	};
	return { query, products, handleChange, handleClick, handleSubmit, error, ref };
}
