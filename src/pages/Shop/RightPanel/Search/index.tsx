import React, { useState } from "react";
import { Output } from "./Output";
import { useDb } from "../../../../RootLayout";
import { TextError } from "../../../../components/TextError";
import { Field } from "../../Field";
import { Input } from "../../../../components/ui/input";
import { Loader2 } from "lucide-react";
import { ItemWithoutDisc } from "../../schema";
import { ProductResult, useProductSearch } from "~/hooks/useProductSearch";
import { useDebouncedCallback } from "use-debounce";

export function Search({
	sendItem,
	mode,
	products: all,
}: {
	sendItem: (item: ItemWithoutDisc) => void;
	mode: "sell" | "buy";
	products: DB.Product[];
}) {
	const [products, setProducts] = useState<ProductResult[]>([]);
	const { search } = useProductSearch(all);
	const debounced = useDebouncedCallback((value: string) => {
		if (value.trim() === "") {
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
	}, 500);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [name, setName] = useState("");
	const [barcode, setBarcode] = useState<string | null>(null);
	const db = useDb();
	const handleChangeBarcode = (e: React.ChangeEvent<HTMLInputElement>) => {
		const n = e.currentTarget.value;
		if (n === "") {
			setBarcode(null);
			setProducts([]);
			return;
		}
		setBarcode(n.trim());
		debounced(n);
	};
	const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
		const n = e.currentTarget.value;
		setName(n);
		setBarcode(null);
		debounced(n);
	};
	const handleClick = (item: ItemWithoutDisc) => {
		sendItem(item);
		setProducts([]);
		setBarcode(null);
		setName("");
		setError("");
	};
	const handleSubmitBarcode = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (loading || error !== "") {
			return;
		}
		if (barcode === null || barcode === "") {
			return;
		}
		setLoading(true);
		const [errMsg, product] = await db.product.getByBarcode(barcode);
		if (errMsg !== null) {
			setError(errMsg);
			setLoading(false);
			return;
		}
		if (product === null) {
			setError("Barang tidak ditemukan");
			setLoading(false);
			return;
		}
		setLoading(false);
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
			<form onSubmit={handleSubmitBarcode} className="flex items-end gap-1 px-1">
				<Field label="Barcode">
					<Input type="text" value={barcode ?? ""} onChange={handleChangeBarcode} />
				</Field>
				{loading ? <Loader2 size={35} className="animate-spin my-3" /> : null}
			</form>
			<hr />
			<Field label="Cari Nama" className="px-1">
				<Input type="search" value={name} onChange={handleChangeName} />
			</Field>
			{error ? <TextError>{error}</TextError> : null}
			<Output products={products} handleClick={handleClick} mode={mode} />
		</>
	);
}
