import { Button } from "../../components/ui/button";
import { Field } from "./Field";
import { Input } from "../../components/ui/input";
import { useContext, useState } from "react";
import { z } from "zod";
import { numeric, numerish } from "../../lib/utils";
import { ItemContext } from "./reducer";
import { TextError } from "../../components/TextError";
import { useDb } from "../../Layout";
import { Loader2 } from "lucide-react";

const itemSchema = z.object({
	name: z.string().min(1),
	price: numerish,
	qty: numeric,
	disc: z.object({
		type: z.enum(["number", "percent"]),
		value: z
			.string()
			.refine((v) => !Number.isNaN(v))
			.transform((v) => (v === "" ? "0" : v)),
	}),
	barcode: z
		.string()
		.refine((v) => !Number.isNaN(v))
		.transform((v) => (v === "" ? null : Number(v))),
	stock: numeric,
});

export function Manual() {
	const [disc, setDisc] = useState("percent");
	const [error, setError] = useState({
		name: "",
		price: "",
		qty: "",
		disc: "",
		barcode: "",
		stock: "",
	});
	const [loading, setLoading] = useState(false);
	const db = useDb();
	const { dispatch } = useContext(ItemContext);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formEl = e.currentTarget;
		const nameEl = formEl.querySelector<HTMLInputElement>(`[name="name"]`);
		if (nameEl === null) {
			return;
		}
		const formData = new FormData(formEl);
		const parsed = itemSchema.safeParse({
			name: formData.get("name"),
			price: formData.get("price"),
			qty: formData.get("qty"),
			disc: {
				value: formData.get("disc-value"),
				type: formData.get("disc-type"),
			},
			barcode: formData.get("barcode"),
			stock: formData.get("stock"),
		});
		if (!parsed.success) {
			const errs = parsed.error.flatten().fieldErrors;
			setError({
				name: errs.name?.join("; ") ?? "",
				price: errs.price?.join("; ") ?? "",
				qty: errs.qty?.join("; ") ?? "",
				disc: errs.disc?.join("; ") ?? "",
				barcode: errs.barcode?.join("; ") ?? "",
				stock: errs.stock?.join("; ") ?? "",
			});
			return;
		}
		const { disc, name, price, qty, barcode, stock } = parsed.data;
		if (qty > stock) {
			setError((prev) => ({ ...prev, qty: "Kuantitas tidak boleh melebihi stok" }));
			return;
		}
		if (qty <= 0) {
			setError((prev) => ({ ...prev, qty: "Kuantitas minimal 1" }));
			return;
		}
		if (barcode !== null) {
			setLoading(true);
			const [errMsg] = await db.product.getByBarcode(barcode);
			switch (errMsg) {
				case "Aplikasi bermasalah":
					setError((prev) => ({ ...prev, barcode: errMsg }));
					setLoading(false);
					return;
				case "Barang tidak ada":
					dispatch({
						action: "add-manual",
						data: { disc, name, price, qty, barcode, stock },
					});
					setLoading(false);
					setError({ name: "", price: "", qty: "", disc: "", barcode: "", stock: "" });
					formEl.reset();
					nameEl.focus();
					return;
			}
			setError((prev) => ({ ...prev, barcode: "Barang sudah ada, gunakan otomatis" }));
			setLoading(false);
		} else {
			dispatch({
				action: "add-manual",
				data: { disc, name, price, qty, barcode, stock },
			});
			setError({ name: "", price: "", qty: "", disc: "", barcode: "", stock: "" });
			formEl.reset();
			nameEl.focus();
		}
	};
	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col px-1 pb-1 gap-2  grow shrink basis-0 overflow-auto"
		>
			<Field label="Nama" error={error.name}>
				<Input type="text" required name="name" />
			</Field>
			<Field label="Harga" error={error.price}>
				<div className="flex items-center gap-1">
					<p className="text-2xl">Rp</p>
					<Input type="number" required name="price" />
				</div>
			</Field>
			<div className="flex gap-2">
				<Field label="Kuantitas*" error={error.qty}>
					<Input type="number" defaultValue={1} required name="qty" />
				</Field>
				<Field label="Stok" error={error.stock}>
					<Input type="number" defaultValue={1} name="stock" />
				</Field>
			</div>
			<div className="flex gap-1 items-end">
				<Field label="Diskon">
					<Input type="number" step={disc === "number" ? 1 : 0.01} name="disc-value" />
				</Field>
				<select
					value={disc}
					onChange={(e) => {
						setDisc(e.currentTarget.value);
					}}
					name="disc-type"
					className="h-[54px] w-fit  outline text-3xl"
				>
					<option value="number">Angka</option>
					<option value="percent">Persen</option>
				</select>
			</div>
			{error.disc === "" ? null : <TextError>{error.disc}</TextError>}
			<Field label="Barcode" error={error.barcode}>
				<Input type="number" name="barcode" />
			</Field>
			<Button>Tambahkan {loading ? <Loader2 className="animate-spin" /> : null}</Button>
		</form>
	);
}
