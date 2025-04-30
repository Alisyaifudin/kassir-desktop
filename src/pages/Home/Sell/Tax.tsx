import React, { useContext, useState } from "react";
import { ItemContext } from "./reducer";
import { Field } from "./Field";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { z } from "zod";
import { numeric } from "../../../lib/utils";
import { X } from "lucide-react";
import Decimal from "decimal.js";
import { calcTax } from "./submit";

const taxSchema = z.object({
	name: z.string().min(1, "Harus ada"),
	value: numeric,
});

export function TaxField() {
	const [error, setError] = useState({ name: "", value: "" });
	const { dispatch } = useContext(ItemContext);
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		const formEl = e.currentTarget;
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = taxSchema.safeParse({
			name: formData.get("name"),
			value: formData.get("value"),
		});
		if (!parsed.success) {
			const errs = parsed.error.flatten().fieldErrors;
			setError({
				name: errs.name?.join("; ") ?? "",
				value: errs.value?.join("; ") ?? "",
			});
			return;
		}
		const { name, value } = parsed.data;
		if (value <= 0) {
			setError((prev) => ({ ...prev, value: "Harus lebih dari nol" }));
			return;
		}
		if (value > 100) {
			setError((prev) => ({ ...prev, value: "Maksimal 100" }));
			return;
		}
		setError({ name: "", value: "" });
		dispatch({ action: "add-tax", name, value });
		formEl.reset();
	};
	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-1 px-1">
			<h2 className="font-bold text-2xl">Pajak</h2>
			<Field label="Nama" error={error.name}>
				<Input type="text" name="name" />
			</Field>
			<Field label="Nilai (%)" error={error.value}>
				<Input type="number" name="value" />
			</Field>
			<Button>Tambahkan</Button>
		</form>
	);
}

export function TaxItem({
	name,
	value,
	index,
	totalBeforeTax,
}: {
	value: number;
	name: string;
	index: number;
	totalBeforeTax: Decimal;
}) {
	const { dispatch } = useContext(ItemContext);
	const tax = calcTax(totalBeforeTax, value);
	return (
		<div className="grid grid-cols-[1fr_70px_160px_50px] justify-end gap-1 text-3xl">
			<p className="text-end">{name}</p>
			<p className="text-end">{value}%</p>
			<p className="text-end">Rp{tax.toNumber().toLocaleString("id-ID")}</p>
			<div className="py-0.5 flex items-center">
				<button
					onClick={() => dispatch({ action: "delete-tax", index })}
					className="bg-red-500 text-white"
				>
					<X size={35} />
				</button>
			</div>
		</div>
	);
}
