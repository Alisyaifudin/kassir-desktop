import React, { useState } from "react";
import { Output } from "./Output";
import { useDb } from "../../../../Layout";
import { TextError } from "../../../../components/TextError";
import { Field } from "../../Field";
import { Input } from "../../../../components/ui/input";
import { Loader2 } from "lucide-react";
import { Item } from "../../schema";

export function Search({ sendItem }: { sendItem: (item: Item) => void }) {
	const [products, setProducts] = useState<DB.Product[]>([]);
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
		db.product.searchByBarcode(n).then((res) => {
			const [errMsg, items] = res;
			if (errMsg !== null) {
				setError(errMsg);
				return;
			}
			setError("");
			setProducts(items);
		});
	};
	const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
		const n = e.currentTarget.value;
		setName(n);
		setBarcode(null);
		if (n === "") {
			setProducts([]);
			return;
		}
		db.product.searchByName(n).then((res) => {
			const [errMsg, items] = res;
			if (errMsg !== null) {
				setError(errMsg);
				return;
			}
			setError("");
			setProducts(items);
		});
	};
	const handleClick = (item: Item) => {
		if (item.qty === 0) {
			setError("Stok barang habis");
			return;
		}
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
		if (product.stock === 0) {
			setError("Stok habis");
			setLoading(false);
			return;
		}
		setLoading(false);
		handleClick({
			barcode: product.barcode,
			disc: {
				type: "percent",
				value: 0,
			},
			name: product.name,
			price: product.price,
			qty: 1,
			id: product.id,
			stock: product.stock,
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
				<Input type="search" value={name} onChange={handleChangeName}/>
			</Field>
			{error ? <TextError>{error}</TextError> : null}
			<Output products={products} handleClick={handleClick} />
		</>
	);
}
