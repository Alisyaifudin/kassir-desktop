import { Button } from "../../components/ui/button";
import { Field } from "./Field";
import { Input } from "../../components/ui/input";
import { useContext, useState } from "react";
import { z } from "zod";
import { numerish } from "../../utils";
import { ItemContext, itemMethod } from "./item-method";

const itemSchema = z.object({
	name: z.string().min(1),
	price: numerish,
	qty: numerish,
	disc: z.object({
		type: z.enum(["number", "percent"]),
		value: numerish,
	}),
});

export function Manual() {
	const [disc, setDisc] = useState("number");
	const [error, setError] = useState({ name: "", price: "", qty: "", disc: "" });
	const { setItems } = useContext(ItemContext);
	const { addItemManual } = itemMethod(setItems);
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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
			});
			return;
		}
		addItemManual(parsed.data);
		e.currentTarget.reset();
	};
	return (
		<>
			<h2 className="font-bold">Manual</h2>
			<form onSubmit={handleSubmit} className="flex flex-col gap-2">
				<Field label="Nama">
					<Input type="text" required name="name" />
				</Field>
				<Field label="Harga">
					<div className="flex items-center gap-1">
						<p>Rp</p>
						<Input type="number" required name="price" />
					</div>
				</Field>
				<Field label="Kuantitas">
					<Input type="number" defaultValue={1} required name="qty" />
				</Field>
				<div className="flex gap-1 items-end">
					<Field label="Diskon">
						<Input type="number" defaultValue={0} name="disc-value" />
					</Field>
					<select
						value={disc}
						onChange={(e) => {
							setDisc(e.currentTarget.value);
						}}
						name="disc-type"
						className="h-[34px] w-fit outline"
					>
						<option value="number">Angka</option>
						<option value="percent">Persen</option>
					</select>
				</div>
				<Button>Tambahkan</Button>
			</form>
		</>
	);
}
