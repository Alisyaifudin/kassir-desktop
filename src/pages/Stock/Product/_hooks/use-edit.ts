import { NavigateFunction } from "react-router";
import { z } from "zod";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";
import { getBackURL, integer, numeric } from "~/lib/utils";

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
	id: z.number(),
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

export function useEdit(id: number, navigate: NavigateFunction, db: Database) {
	const { action, error, loading, setError } = useAction(
		emptyErrs,
		(data: z.infer<typeof dataSchema>) => {
			const updatedAt = Math.floor(Date.now() / 1000);
			return db.product.update.one({ ...data, updatedAt });
		}
	);

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
			id,
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
			setError({ ...emptyErrs, global: errMsg });
			return;
		}
		const backURL = getBackURL("/stock", new URLSearchParams(window.location.search));
		navigate(backURL);
	};
	return { loading, error, handleSubmit };
}
