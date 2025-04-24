import { Button } from "../../components/ui/button";
import { Field } from "./Field";
import { Input } from "../../components/ui/input";
import { useContext, useState } from "react";
import { z } from "zod";
import { numerish } from "../../utils";
import { ItemContext, itemMethod } from "./item-method";
import { useDb } from "../../Layout";
import {
	Accordion,
	AccordionItem,
	AccordionTrigger,
	AccordionContent,
} from "../../components/ui/accordion";

const itemSchema = z.object({
	name: z.string().min(1),
	price: numerish,
	qty: numerish,
	disc: z.object({
		type: z.enum(["number", "percent"]),
		value: numerish,
	}),
	barcode: numerish.nullable(),
});

export function Manual() {
	const [disc, setDisc] = useState("number");
	const [error, setError] = useState({ name: "", price: "", qty: "", disc: "", barcode: "" });
	const { setItems } = useContext(ItemContext);
	const db = useDb();
	const { addItemManual } = itemMethod(db, setItems);
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
				barcode: errs.barcode?.join("; ") ?? "",
			});
			return;
		}
		addItemManual(parsed.data);
		e.currentTarget.reset();
	};
	return (
		<Accordion type="single" collapsible>
			<AccordionItem value="item-1">
				<AccordionTrigger>
					<h2 className="font-bold">Manual</h2>
				</AccordionTrigger>
				<AccordionContent>
					<form onSubmit={handleSubmit} className="flex px-1 flex-col gap-2">
						<Field label="Nama" error={error.name}>
							<Input type="text" required name="name" />
						</Field>
						<Field label="Harga" error={error.price}>
							<div className="flex items-center gap-1">
								<p>Rp</p>
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
								className="h-[34px] w-fit outline"
							>
								<option value="number">Angka</option>
								<option value="percent">Persen</option>
							</select>
						</div>
						{error.disc === "" ? null : <p className="text-red-500">{error.disc}</p>}
						<Field label="Barcode" error={error.barcode}>
							<Input type="number" name="barcode" />
						</Field>
						<Button>Tambahkan</Button>
					</form>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
