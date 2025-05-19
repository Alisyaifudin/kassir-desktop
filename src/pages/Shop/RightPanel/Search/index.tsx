import React, { useState } from "react";
import { Output } from "./Output";
import { TextError } from "~/components/TextError";
import { Field } from "./Field";
import { Input } from "~/components/ui/input";
import { ItemWithoutDisc } from "../../schema";
import { ProductResult, useProductSearch } from "~/hooks/useProductSearch";
import { useDebouncedCallback } from "use-debounce";
import { useItem } from "../../context";

export function Search({ mode, products: all }: { mode: "sell" | "buy"; products: DB.Product[] }) {
	const { setItem } = useItem();
	const [query, setQuery] = useState("");
	const [products, setProducts] = useState<ProductResult[]>([]);
	const { search } = useProductSearch(all);
	const debounced = useDebouncedCallback((value: string) => {
		if (value.trim() === "" || query === "") {
			setProducts([]);
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
			setProducts(results);
		}
	}, 300);
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
		setItem(item);
		setProducts([]);
		setQuery("");
		setError("");
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
			id: product.id,
			stock: product.stock,
			capital: product.capital,
		});
	};
	return (
		<>
			<form onSubmit={handleSubmit} className="flex items-end gap-1 px-1">
				<Field label="Cari">
					<Input type="search" value={query} onChange={handleChange} aria-autocomplete="list" />
				</Field>
			</form>
			{error ? <TextError>{error}</TextError> : null}
			<Output products={products} handleClick={handleClick} mode={mode} />
		</>
	);
}
