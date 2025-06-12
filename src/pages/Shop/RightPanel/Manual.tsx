import { Button } from "~/components/ui/button";
import { Field } from "../Field";
import { Input } from "~/components/ui/input";
import { useRef, useState } from "react";
import { z } from "zod";
import { TextError } from "~/components/TextError";
import { useSetData } from "../context";
// import { useItem } from "../context";

const itemSchema = z.object({
	barcode: z.string().trim(),
	name: z.string().min(1).trim(),
	price: z
		.string()
		.refine((v) => !isNaN(Number(v)))
		.transform((v) => Number(v)),
	qty: z
		.string()
		.refine((v) => !isNaN(Number(v)))
		.transform((v) => Number(v)),
	stock: z
		.string()
		.refine((v) => !isNaN(Number(v)))
		.transform((v) => Number(v)),
});

const emptyErr = { name: "", price: "", qty: "", barcode: "" };

export function Manual({
	mode,
	fix,
	products,
}: {
	mode: "buy" | "sell";
	fix: number;
	products: DB.Product[];
}) {
	const [error, setError] = useState(emptyErr);
	const ref = useRef<HTMLInputElement | null>(null);
	const { items: set } = useSetData();
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
		set.add(mode, {
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
	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col gap-2 grow shrink px-1 basis-0 overflow-y-auto"
		>
			<Field label="Barcode" error={error.barcode}>
				<Input ref={ref} type="text" name="barcode" aria-autocomplete="list" />
			</Field>
			<Field label="Nama" error={error.name}>
				<Input type="text" required name="name" aria-autocomplete="list" />
			</Field>
			<Field label="Harga" error={error.price}>
				<div className="flex items-center gap-1">
					<p className="text-2xl">Rp</p>
					<Input
						type="number"
						required
						name="price"
						step={1 / Math.pow(10, fix)}
						aria-autocomplete="list"
					/>
				</div>
			</Field>
			<div className="flex gap-1 items-center">
				{mode === "sell" ? (
					<Field label="Kuantitas">
						<Input type="number" defaultValue={1} required name="qty" />
					</Field>
				) : null}
				<Field label="Stok" error={error.qty}>
					<Input type="number" defaultValue={1} required name="stock" />
				</Field>
			</div>
			{error.qty === "" ? null : <TextError>{error.qty}</TextError>}
			<Button>Tambahkan </Button>
		</form>
	);
}
