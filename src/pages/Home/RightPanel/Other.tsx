import React, { useState } from "react";
import { Field } from "../Field";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Other, otherSchema } from "../schema";

export function OtherComponent({ sendOther }: { sendOther: (other: Other) => void }) {
	const [error, setError] = useState({ name: "", value: "", kind: "" });
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		const formEl = e.currentTarget;
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = otherSchema.safeParse({
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
		sendOther(parsed.data);
		formEl.reset();
	};
	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-1 px-1">
			<h2 className="font-bold text-2xl">Biaya Tambahan</h2>
			<Field label="Nama" error={error.name}>
				<Input type="text" name="name" />
			</Field>
			<div className="flex items-end gap-2">
				<Field label="Nilai" error={error.value}>
					<Input type="number" name="value" />
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
