import { z } from "zod";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";

export function useEdit(id: number, revalidate: () => void, db: Database) {
	const { loading, error, setError, action } = useAction(
		{ name: "", value: "", global: "" },
		({ id, name, value }: { id: number; name: string; value: string }) =>
			db.social.update.one(id, name, value)
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z
			.object({
				id: z.number(),
				name: z.string().min(1, { message: "Harus ada" }),
				value: z.string().min(1, { message: "Harus ada" }),
			})
			.safeParse({
				id,
				name: formData.get("name"),
				value: formData.get("value"),
			});
		if (!parsed.success) {
			const errs = parsed.error.flatten().fieldErrors;
			setError({
				global: "",
				name: errs.name?.join("; ") ?? "",
				value: errs.value?.join("; ") ?? "",
			});
			return;
		}
		const errMsg = await action(parsed.data);
		if (errMsg === null) {
			setError(null);
			revalidate();
		} else {
			setError({ global: errMsg, name: "", value: "" });
		}
	};
	return { loading, error, handleSubmit };
}
