import { useEffect, useRef } from "react";
import { NavigateFunction } from "react-router";
import { z } from "zod";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";
import { integer, numeric } from "~/lib/utils";

const dataSchema = z.object({
	name: z.string().min(1),
	price: numeric,
	stock: integer,
	stockBack: z.coerce.number().int(),
	capital: z
		.string()
		.refine((v) => !Number.isNaN(v))
		.transform((v) => (v === "" ? 0 : Number(v))),
	barcode: z.string().transform((v) => (v === "" ? null : v)),
	note: z.string(),
});

const emptyErrs = {
	name: "",
	price: "",
	stock: "",
	stockBack: "",
	barcode: "",
	global: "",
	capital: "",
	note: "",
};

export function useNewProduct(navigate: NavigateFunction, db: Database) {
	const ref = useRef<HTMLInputElement | null>(null);
	const { action, error, loading, setError } = useAction(
		emptyErrs,
		(data: z.infer<typeof dataSchema>) => db.product.add.one(data)
	);
	useEffect(() => {
		if (!ref.current) {
			return;
		}
		ref.current.focus();
	}, []);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = dataSchema.safeParse({
			name: formData.get("name"),
			price: formData.get("price"),
			stock: formData.get("stock"),
			stockBack: formData.get("stock-back"),
			barcode: formData.get("barcode"),
			capital: formData.get("capital"),
			note: formData.get("note"),
		});
		if (!parsed.success) {
			const errs = parsed.error.flatten().fieldErrors;
			setError({
				name: errs.name?.join("; ") ?? "",
				price: errs.price?.join("; ") ?? "",
				stock: errs.stock?.join("; ") ?? "",
				stockBack: errs.stockBack?.join("; ") ?? "",
				barcode: errs.barcode?.join("; ") ?? "",
				capital: errs.capital?.join("; ") ?? "",
				note: errs.note?.join("; ") ?? "",
				global: "",
			});
			return;
		}
		const errMsg = await action(parsed.data);
		if (errMsg) {
			setError({
				...emptyErrs,
				global: errMsg,
			});
			return;
		}
		db.product.revalidate("all");
		navigate(-1);
	};
	return { loading, error, handleSubmit, ref };
}
