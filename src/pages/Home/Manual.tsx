import { Button } from "../../components/ui/button";
import { Field } from "./Field";
import { Input } from "../../components/ui/input";
import { useContext, useState } from "react";
import { z } from "zod";
import { numerish } from "../../utils";
import { ItemContext } from "./reducer";

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
	const { dispatch } = useContext(ItemContext);
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
		const { disc, name, price, qty } = parsed.data;
		dispatch({
			action: "add-manual",
			data: { disc, name, price, qty },
		});
		e.currentTarget.reset();
	};
	return (
		<form onSubmit={handleSubmit} className="flex flex-col px-1 gap-2">
			<Field label="Nama" error={error.name}>
				<Input type="text" required name="name" />
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
					<Input type="number" defaultValue={0} name="disc-value" />
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
			{error.disc === "" ? null : <p className="text-red-500">{error.disc}</p>}
			<Button>Tambahkan</Button>
		</form>
	);
}
