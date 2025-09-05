import { useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { ProductResult, useProductSearch } from "~/hooks/useProductSearch";
import { Additional, ItemWithoutDisc } from "../_utils/schema";
import { useItems } from "./use-items";
import { LocalContext } from "./use-local-state";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { useAdditionalSearch } from "~/hooks/useAdditionalSearch";
import { useAdditional } from "./use-additional";

export function useSearch(
	allProducts: DB.Product[],
	allAdditionals: DB.AdditionalItem[],
	context: LocalContext
) {
	const [query, setQuery] = useState("");
	const ref = useRef<HTMLInputElement>(null);
	const [products, setProducts] = useState<ProductResult[]>([]);
	const [additionals, setAdditionals] = useState<Additional[]>([]);
	const [, setItems] = useItems(context);
	const [, setAdditionalItems] = useAdditional(context);
	const { search: searchProduct } = useProductSearch(allProducts);
	const { search: searchAdditional } = useAdditionalSearch(allAdditionals);
	const debounced = useDebouncedCallback((value: string) => {
		if (value.trim() === "" || query === "") {
			setProducts([]);
			setAdditionals([]);
		} else {
			const products = searchProduct(value.trim().replace(/(\(|\))/g, ""), {
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
			const additionals = searchAdditional(value.trim().replace(/(\(|\))/g, ""), {
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
			setProducts(products);
			setAdditionals(
				additionals.map((a) => ({ kind: a.kind, name: a.name, saved: false, value: a.value }))
			);
		}
	}, DEBOUNCE_DELAY);
	const [error, setError] = useState("");
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.currentTarget.value;
		setQuery(val.trimStart());
		setError("");
		if (val.trim() === "") {
			setProducts([]);
			setAdditionals([]);
			return;
		}
		debounced(val);
	};
	const handleClickProduct = (item: ItemWithoutDisc) => {
		if (ref.current === null) return;
		setItems.add(item);
		setProducts([]);
		setAdditionals([]);
		setQuery("");
		setError("");
		ref.current.focus();
	};
	const handleClickAdditional = (item: Additional) => {
		if (ref.current === null) return;
		setAdditionalItems.add(item);
		setProducts([]);
		setAdditionals([]);
		setQuery("");
		setError("");
		ref.current.focus();
	};
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (error !== "" || query.trim() === "") {
			return;
		}
		const product = allProducts.find((p) => p.barcode === query.trim());
		const additional = allAdditionals.find(
			(p) => p.name.toLowerCase() === query.toLowerCase().trim()
		);
		if (product !== undefined) {
			handleClickProduct({
				barcode: product.barcode,
				name: product.name,
				price: product.price,
				qty: 1,
				productId: product.id,
				stock: product.stock,
				capital: product.capital,
			});
			return;
		}
		if (additional !== undefined) {
			handleClickAdditional({
				kind: additional.kind,
				name: additional.name,
				saved: false,
				value: additional.value,
			});
			return;
		}
		setError("Barang tidak ditemukan");
	};
	return {
		query,
		products,
		additionals,
		handleChange,
		handleClickProduct,
		handleClickAdditional,
		handleSubmit,
		error,
		ref,
	};
}
