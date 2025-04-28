import React, { useContext, useState } from "react";
import { Output } from "./Output";
import { useDb } from "../../../Layout";
import { TextError } from "../../../components/TextError";
import { Field } from "../Field";
import { Input } from "../../../components/ui/input";
import { ItemContext } from "../reducer";
import { numeric } from "../../../utils";
import { Loader2 } from "lucide-react";

export function Search() {
	const [products, setProducts] = useState<DB.Product[]>([]);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [name, setName] = useState("");
	const { dispatch } = useContext(ItemContext);
	const [barcode, setBarcode] = useState<number | null>(null);
	const db = useDb();
	const handleChangeBarcode = (e: React.ChangeEvent<HTMLInputElement>) => {
		const n = e.currentTarget.value;
		if (Number.isNaN(n)) {
			return;
		}
		if (n === "") {
			setBarcode(null);
			setProducts([]);
			return;
		}
		setBarcode(Number(n));
		db.product.searchByBarcode(Number(n)).then((res) => {
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
	const handleClick = (data: {
		name: string;
		price: string;
		stock: number;
		id: number;
		barcode?: number;
	}) => {
		dispatch({
			action: "add-select",
			data,
		});
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
		const formData = new FormData(e.currentTarget);
		setLoading(true);
		const parsed = numeric.safeParse(formData.get("barcode"));
		if (!parsed.success) {
			setError(parsed.error.flatten().formErrors.join("; "));
			setLoading(false);
			return;
		}
		const [errMsg, product] = await db.product.getByBarcode(parsed.data);
		if (errMsg !== null) {
			setError(errMsg);
			setLoading(false);
			return;
		}
		setLoading(false);
		handleClick({
			name: product.name,
			id: product.id,
			price: product.price.toString(),
			stock: product.stock,
			barcode: product.barcode!,
		});
	};
	return (
		<>
			<form onSubmit={handleSubmitBarcode} className="flex items-end gap-1">
				<Field label="Barcode">
					<Input
						type="number"
						value={barcode ?? ""}
						onChange={handleChangeBarcode}
						name="barcode"
					/>
				</Field>
				{loading ? <Loader2 size={35} className="animate-spin my-3" /> : null}
			</form>
			<hr />
			<Field label="Nama">
				<Input type="search" value={name} onChange={handleChangeName} />
			</Field>
			{error ? <TextError>{error}</TextError> : null}
			<Output products={products} handleClick={handleClick} />
		</>
	);
}
