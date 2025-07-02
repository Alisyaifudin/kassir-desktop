import { z } from "zod";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";

export function useAdd(setOpen: (open: boolean) => void, revalidate: () => void, db: Database) {
	const { loading, error, setError, action } = useAction(
		{ name: "", value: "", global: "" },
		({ name, value }: { name: string; value: string }) => db.social.add.one(name, value)
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z
			.object({
				name: z.string().min(1, { message: "Harus ada" }),
				value: z.string().min(1, { message: "Harus ada" }),
			})
			.safeParse({
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
			setOpen(false);
			revalidate();
		} else {
			setError({ global: errMsg, name: "", value: "" });
		}
	};
	return { loading, error, handleSubmit };
}
