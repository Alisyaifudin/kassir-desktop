import { Button } from "../../components/ui/button";
import { Field } from "./Field";
import { Input } from "../../components/ui/input";
import { useContext, useRef, useState } from "react";
import { z } from "zod";
import { numerish } from "../../utils";
import { ItemContext } from "./reducer";
import { TextError } from "../../components/TextError";
import { useDb } from "../../Layout";

const itemSchema = z.object({
	name: z.string().min(1),
	price: numerish,
	qty: numerish,
	disc: z.object({
		type: z.enum(["number", "percent"]),
		value: numerish,
	}),
});

const barcodeSchema = z
	.string()
	.refine((v) => !Number.isNaN(v))
	.transform((v) => (v === "" ? undefined : Number(v)));

export function BuyInput() {
	const [disc, setDisc] = useState("number");
	const [error, setError] = useState({ name: "", price: "", qty: "", disc: "", barcode: "" });
	const { dispatch } = useContext(ItemContext);
	const ref = useRef<HTMLInputElement | null>(null);
	const db = useDb();
	const [barcode, setBarcode] = useState<undefined | number>(undefined);
	const handleSearchBarcode = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!ref.current) {
			return;
		}
		const formData = new FormData(e.currentTarget);
		const parsed = z.object({ barcode: barcodeSchema }).safeParse({
			barcode: formData.get("barcode"),
		});
		if (!parsed.success) {
			setError((prev) => ({
				...prev,
				barcode: parsed.error.flatten().fieldErrors.barcode?.join("; ") ?? "",
			}));
			return;
		}
		const { barcode } = parsed.data;
		if (barcode === undefined) {
			return;
		}
		const [errMsg, product] = await db.product.getByBarcode(barcode);
		switch (errMsg) {
			case "Aplikasi bermasalah":
				setError((prev) => ({
					...prev,
					barcode: errMsg,
				}));
				return;
			case "Barang tidak ada":
				return;
		}
		ref.current.value = product.name;
	};
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		if (!ref.current) {
			return;
		}
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = itemSchema.safeParse({
			name: formData.get("name"),
			price: formData.get("price"),
			qty: formData.get("qty"),
			disc: {
				value: formData.get("disc-value"),
				type: formData.get("disc-type"),
			},
		});
		if (!parsed.success) {
			const errs = parsed.error.flatten().fieldErrors;
			setError({
				name: errs.name?.join("; ") ?? "",
				price: errs.price?.join("; ") ?? "",
				qty: errs.qty?.join("; ") ?? "",
				disc: errs.disc?.join("; ") ?? "",
				barcode: error.barcode,
			});
			return;
		}
		const { disc, name, price, qty } = parsed.data;
		dispatch({
			action: "add-buy",
			data: { disc, name, price, qty, barcode },
		});
		setBarcode(undefined);
		ref.current.focus();
		e.currentTarget.reset();
	};
	return (
		<div className="flex flex-col px-1 gap-2">
			<form onSubmit={handleSearchBarcode}>
				<Field label="Barcode" error={error.barcode}>
					<Input
						value={barcode ?? ""}
						onChange={(e) => {
							setBarcode(e.currentTarget.value === "" ? undefined : Number(e.currentTarget.value));
							setError((prev) => ({ ...prev, barcode: "" }));
						}}
						type="number"
						name="barcode"
					/>
				</Field>
			</form>
			<form onSubmit={handleSubmit} className="flex flex-col px-1 gap-2">
				<Field label="Nama" error={error.name}>
					<Input ref={ref} type="text" required name="name" />
				</Field>
				<Field label="Harga" error={error.price}>
					<div className="flex items-center gap-1">
						<p className="text-2xl">Rp</p>
						<Input type="number" required name="price" />
					</div>
				</Field>
				<Field label="Kuantitas" error={error.qty}>
					<Input type="number" defaultValue={1} required name="qty" />
				</Field>
				<div className="flex gap-1 items-end">
					<Field label="Diskon">
						<Input type="number" defaultValue={0} step={0.01} name="disc-value" />
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
				<Button>Tambahkan</Button>
			</form>
		</div>
	);
}
