import { Button } from "../../../components/ui/button";
import { Field } from "../Field";
import { Input } from "../../../components/ui/input";
import { useRef, useState } from "react";
import { z } from "zod";
import { TextError } from "../../../components/TextError";
import { useDb } from "../../../Layout";
import { ItemWithoutDisc } from "../schema";
import { Loader2 } from "lucide-react";

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
	sendItem,
	mode,
}: {
	sendItem: (item: ItemWithoutDisc) => void;
	mode: "buy" | "sell";
}) {
	const [error, setError] = useState(emptyErr);
	const [loading, setLoading] = useState(false);
	const ref = useRef<HTMLInputElement | null>(null);
	const db = useDb();
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
			setLoading(true);
			const [errMsg, product] = await db.product.getByBarcode(barcode);
			setLoading(false);
			if (errMsg) {
				setError({ ...emptyErr, barcode: errMsg });
				return;
			}
			if (product !== null) {
				setError({ ...emptyErr, barcode: "Barang sudah ada. Gunakan otomatis." });
				return;
			}
		}
		sendItem({
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
				<Input ref={ref} type="text" name="barcode" />
			</Field>
			<Field label="Nama" error={error.name}>
				<Input type="text" required name="name" />
			</Field>
			<Field label="Harga" error={error.price}>
				<div className="flex items-center gap-1">
					<p className="text-2xl">Rp</p>
					<Input type="number" required name="price" />
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
			{/* <div className="flex gap-1 items-end">
				<Field label="Diskon">
					<Input type="number" defaultValue={0} step={0.0001} name="disc-value" />
				</Field>
				<select
					name="disc-type"
					defaultValue="percent"
					className="h-[54px] w-fit  outline text-3xl"
				>
					<option value="number">Angka</option>
					<option value="percent">Persen</option>
				</select>
			</div>
			{error.disc === "" ? null : <TextError>{error.disc}</TextError>} */}
			<Button>Tambahkan {loading ? <Loader2 className="animate-spin" /> : null}</Button>
		</form>
	);
}
