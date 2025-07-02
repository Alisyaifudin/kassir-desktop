import { useAction } from "~/hooks/useAction";
import { z } from "zod";
import { Database } from "~/database";

export function useAdd(
	kind: DB.MethodEnum,
	setOpen: (open: boolean) => void,
	revalidate: () => void,
	db: Database
) {
	const { loading, error, setError, action } = useAction("", (name: string) =>
		db.method.add.one(name, kind)
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z.string().min(1, { message: "Harus ada" }).safeParse(formData.get("name"));
		if (!parsed.success) {
			const errs = parsed.error.flatten().formErrors;
			setError(errs.join(";"));
			return;
		}
		const errMsg = await action(parsed.data);
		setError(errMsg);
		if (errMsg === null) {
			setOpen(false);
			revalidate();
		}
	};
	return { loading, error, handleSubmit };
}
