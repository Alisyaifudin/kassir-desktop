import { useEffect, useRef } from "react";
import { NavigateFunction } from "react-router";
import { z } from "zod";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";
import { numeric } from "~/lib/utils";

const dataSchema = z.object({
	name: z.string().min(1),
	value: numeric,
	kind: z.enum(["percent", "number"]),
});

const emptyErrs = {
	name: "",
	value: "",
	kind: "",
	global: "",
};

export function useNewAdditional(navigate: NavigateFunction, db: Database) {
	const ref = useRef<HTMLInputElement | null>(null);
	const { action, error, loading, setError } = useAction(
		emptyErrs,
		async (data: z.infer<typeof dataSchema>) => {
			const [errMsg] = await db.additionalItem.add.one(data);
			return errMsg;
		}
	);
	useEffect(() => {
		if (!ref.current) {
			return;
		}
		ref.current.focus();
	}, []);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = dataSchema.safeParse({
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
				global: "",
			});
			return;
		}
		const errMsg = await action(parsed.data);
		if (errMsg) {
			setError({
				...emptyErrs,
				global: errMsg,
			});
			return;
		}
		db.additionalItem.revalidate("all");
		navigate(-1);
	};
	return { loading, error, handleSubmit, ref };
}
