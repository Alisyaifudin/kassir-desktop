import { useRef, useState } from "react";
import { z } from "zod";
import { useItems } from "./use-items";
import { LocalContext } from "./use-local-state";

const itemSchema = z.object({
	barcode: z.string().trim(),
	name: z.string().trim().min(1, { message: "Harus ada" }),
	price: z
		.string()
		.refine((v) => !isNaN(Number(v)), { message: "Harus angka" })
		.transform((v) => Number(v)),
	qty: z
		.string()
		.refine((v) => !isNaN(Number(v)) || !Number.isInteger(Number(v)) || Number(v) < 0, {
			message: "Tidak valid",
		})
		.transform((v) => Number(v)),
	stock: z
		.string()
		.refine((v) => !isNaN(Number(v)) || !Number.isInteger(Number(v)) || Number(v) < 0, {
			message: "Tidak valid",
		})
		.transform((v) => Number(v)),
});

const emptyErr = { name: "", price: "", qty: "", barcode: "" };

export function useManual(products: DB.Product[], context: LocalContext) {
	const ref = useRef<HTMLInputElement | null>(null);
	const [error, setError] = useState(emptyErr);
	const [_, setItems] = useItems(context);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		if (!ref.current) {
			return;
		}
		e.preventDefault();
		const formEl = e.currentTarget;
		const formData = new FormData(e.currentTarget);
		const parsed = itemSchema.safeParse({
			barcode: formData.get("barcode"),
			name: formData.get("name"),
			price: formData.get("price"),
			qty: formData.get("qty") ?? formData.get("stock"), // for sell, no qty
			stock: formData.get("stock"),
		});
		if (!parsed.success) {
			const errs = parsed.error.flatten().fieldErrors;
			const errQty = errs.qty?.join("; ") ?? "";
			const errStock = errs.stock?.join("; ") ?? "";
			setError({
				name: errs.name?.join("; ") ?? "",
				price: errs.price?.join("; ") ?? "",
				qty: [errQty, errStock].join("; "),
				barcode: errs.barcode?.join("; ") ?? "",
			});
			return;
		}
		const { name, price, qty, barcode, stock } = parsed.data;
		if (barcode !== "") {
			const product = products.find((p) => p.barcode === barcode);
			if (product !== undefined) {
				setError({ ...emptyErr, barcode: "Barang sudah ada. Gunakan otomatis." });
				return;
			}
		}
		setItems.add({
			barcode: barcode === "" ? null : barcode,
			qty,
			price,
			name,
			stock,
		});
		setError(emptyErr);
		ref.current.focus();
		formEl.reset();
	};
  return {handleSubmit, error, ref}
}
