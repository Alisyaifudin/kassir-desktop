import { NavigateFunction } from "react-router";
import { z } from "zod";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";
import { getBackURL, numeric } from "~/lib/utils";

const dataSchema = z.object({
	name: z.string().min(1),
	value: numeric,
	kind: z.enum(["percent", "number"]),
	id: z.number().int(),
});

const emptyErrs = {
	name: "",
	value: "",
	kind: "",
	global: "",
};

export function useEdit(id: number, navigate: NavigateFunction, db: Database) {
	const { action, error, loading, setError } = useAction(
		emptyErrs,
		(data: z.infer<typeof dataSchema>) => {
			return db.additionalItem.update.one(data);
		}
	);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = dataSchema.safeParse({
			name: formData.get("name"),
			value: formData.get("value"),
			kind: formData.get("kind"),
			id,
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
			setError({ ...emptyErrs, global: errMsg });
			return;
		}
		const backURL = getBackURL("/stock", new URLSearchParams(window.location.search));
		navigate(backURL);
	};
	return { loading, error, handleSubmit };
}
