import React, { useState } from "react";
import { Field } from "../Field";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { z } from "zod";
import { useSetData } from "../context";

const additionalSchema = z.object({
	name: z.string().min(1, { message: "Harus punya nama" }).trim(),
	value: z
		.string()
		.refine((v) => !isNaN(Number(v)))
		.transform((v) => Number(v)),
	kind: z.enum(["percent", "number"]),
});

export function AdditionalComponent({ mode }: { mode: "sell" | "buy" }) {
	const { additionals: set } = useSetData();
	const [error, setError] = useState({ name: "", value: "", kind: "" });
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		const formEl = e.currentTarget;
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = additionalSchema.safeParse({
			name: formData.get("name"),
			value: formData.get("value"),
			kind: formData.get("kind"),
		});
		if (!parsed.success) {
			const errs = parsed.error.flatten().fieldErrors;
			setError({
				name: errs.name?.join("; ") ?? "",
				value: errs.value?.join("; ") ?? "",
				kind: errs.kind?.join("; ") ?? "",
			});
			return;
		}
		const { value, kind } = parsed.data;
		if (value <= 0) {
			setError((prev) => ({ ...prev, value: "Harus lebih dari nol" }));
			return;
		}
		if (kind === "percent" && value > 100) {
			setError((prev) => ({ ...prev, value: "Maksimal 100" }));
			return;
		}
		setError({ name: "", value: "", kind: "" });
		set.add(mode, parsed.data);
		formEl.reset();
	};
	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-1 px-1">
			<Field label="Nama" error={error.name}>
				<Input type="text" name="name" aria-autocomplete="list" />
			</Field>
			<div className="flex items-end gap-2">
				<Field label="Nilai" error={error.value}>
					<Input type="number" name="value" aria-autocomplete="list" />
				</Field>
				<select name="kind" defaultValue="percent" className="h-[54px] w-fit  outline text-3xl">
					<option value="number">Angka</option>
					<option value="percent">Persen</option>
				</select>
			</div>
			<Button>Tambahkan</Button>
		</form>
	);
}
