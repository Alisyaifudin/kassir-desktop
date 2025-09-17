import { useRef, useState } from "react";
// import { z } from "zod";
import { useItems } from "./use-items";
import { LocalContext } from "./use-local-state";

// const itemSchema = z.object({
// 	barcode: z.string().trim(),
// 	name: z.string().trim().min(1, { message: "Harus ada" }),
// 	price: z
// 		.string()
// 		.refine((v) => !isNaN(Number(v)), { message: "Harus angka" })
// 		.transform((v) => Number(v)),
// 	qty: z
// 		.string()
// 		.refine((v) => !isNaN(Number(v)) || !Number.isInteger(Number(v)) || Number(v) < 0, {
// 			message: "Tidak valid",
// 		})
// 		.transform((v) => Number(v)),
// 	stock: z
// 		.string()
// 		.refine((v) => !isNaN(Number(v)) || !Number.isInteger(Number(v)) || Number(v) < 0, {
// 			message: "Tidak valid",
// 		})
// 		.transform((v) => Number(v)),
// });

const emptyData = { name: "", price: "", qty: "1", barcode: "", stock: "1" };
const emptyErrs = { barcode: "", qty: "", name: "" };

export function useManual(products: DB.Product[], context: LocalContext) {
	const barcodeRef = useRef<HTMLInputElement | null>(null);
	const nameRef = useRef<HTMLInputElement | null>(null);
	const stockRef = useRef<HTMLInputElement | null>(null);
	const qtyRef = useRef<HTMLInputElement | null>(null);
	const priceRef = useRef<HTMLInputElement | null>(null);
	const [data, setData] = useState(emptyData);
	const [error, setError] = useState(emptyErrs);
	const [_, setItems] = useItems(context);
	const set = {
		barcode(v: string) {
			setData((prev) => ({ ...prev, barcode: v }));
			setError(emptyErrs);
		},
		name(v: string) {
			setData((prev) => ({ ...prev, name: v }));
			setError(emptyErrs);
		},
		price(v: string) {
			const num = Number(v);
			if (isNaN(num) || num < 0) return;
			setData((prev) => ({ ...prev, price: v }));
			setError(emptyErrs);
		},
		qty(v: string) {
			if (v.trim() === "") {
				setData((prev) => ({ ...prev, qty: "" }));
				setError(emptyErrs);
				return;
			}
			const num = Number(v);
			if (isNaN(num) || num < 1 || !Number.isInteger(num)) return;
			setData((prev) => ({ ...prev, qty: v }));
			setError(emptyErrs);
		},
		stock(v: string) {
			if (v.trim() === "") {
				setData((prev) => ({ ...prev, stock: "" }));
				setError(emptyErrs);
				return;
			}
			const num = Number(v);
			if (isNaN(num) || num < 1 || !Number.isInteger(num)) return;
			setData((prev) => ({ ...prev, stock: v }));
			setError(emptyErrs);
		},
	};
	const handleSubmit = async () => {
		if (!barcodeRef.current || !nameRef.current) {
			return;
		}
		// e.preventDefault();
		const { barcode, name } = data;
		if (barcode !== "") {
			const product = products.find((p) => p.barcode === barcode);
			if (product !== undefined) {
				setError({ barcode: "Barang sudah ada. Gunakan otomatis.", qty: "", name: "" });
				return;
			}
		}
		if (name.trim() === "") {
			setError({ ...emptyErrs, name: "Tidak boleh kosong" });
			nameRef.current.focus();
			return;
		}
		const qty = Number(data.qty);
		const price = Number(data.price);
		const stock = Number(data.stock);
		if (
			isNaN(qty) ||
			isNaN(price) ||
			isNaN(stock) ||
			price < 0 ||
			qty < 1 ||
			stock < 1 ||
			!Number.isInteger(qty) ||
			!Number.isInteger(stock)
		) {
			setError({ ...emptyErrs, qty: "Ngaur" });
			return;
		}
		setItems.add({
			barcode: barcode === "" ? null : barcode.trim(),
			qty,
			price,
			name: name.trim(),
			stock,
		});
		setError(emptyErrs);
		setData(emptyData);
		barcodeRef.current.focus();
	};
	const refs = {
		barcode: barcodeRef,
		name: nameRef,
		stock: stockRef,
		qty: qtyRef,
		price: priceRef,
	};
	return { data, set, handleSubmit, error, refs };
}
