import { useState } from "react";
import { z } from "zod";
import { useAdditional } from "./use-additional";
import { LocalContext } from "./use-local-state";

const additionalSchema = z.object({
	name: z.string().min(1, { message: "Harus punya nama" }).trim(),
	value: z
		.string()
		.refine((v) => !isNaN(Number(v)))
		.transform((v) => Number(v)),
	kind: z.enum(["percent", "number"]),
});

const emptyErrs = { name: "", value: "", kind: "" };

export function useNewAdditionalForm(context: LocalContext) {
	const [error, setError] = useState(emptyErrs);
	const [_, setAdditional] = useAdditional(context);
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
		setAdditional.add(parsed.data);
		formEl.reset();
	};
	return { error, handleSubmit };
}
