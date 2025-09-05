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
	saved: z
		.literal("on")
		.nullable()
		.transform((v) => v === "on"),
});

const emptyErrs = { name: "", value: "", kind: "", saved: "" };

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
			saved: formData.get("saved"),
		});
		if (!parsed.success) {
			const errs = parsed.error.flatten().fieldErrors;
			setError({
				name: errs.name?.join("; ") ?? "",
				value: errs.value?.join("; ") ?? "",
				kind: errs.kind?.join("; ") ?? "",
				saved: errs.saved?.join("; ") ?? "",
			});
			return;
		}
		const { value, kind } = parsed.data;
		if (kind === "percent" && value < -100) {
			setError((prev) => ({ ...prev, value: "Minimal 100" }));
			return;
		}
		if (kind === "percent" && value > 100) {
			setError((prev) => ({ ...prev, value: "Maksimal 100" }));
			return;
		}
		setError(emptyErrs);
		setAdditional.add(parsed.data);
		formEl.reset();
	};
	return { error, handleSubmit };
}
