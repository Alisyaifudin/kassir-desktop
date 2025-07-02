import { z } from "zod";
import { useAction } from "~/hooks/useAction";
import { Database } from "~/database";

export function useUpdateName(method: DB.Method, revalidate: () => void, db: Database) {
	const { action, error, loading, setError } = useAction("", (name: string) =>
		db.method.update.one(method.id, name)
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z.string().min(1, { message: "Harus ada" }).safeParse(formData.get("name"));
		if (!parsed.success) {
			setError(parsed.error.flatten().formErrors.join("; "));
			return;
		}
		const name = parsed.data;
		const errMsg = await action(name);
		setError(errMsg);
		if (errMsg === null) {
			revalidate();
		}
	};
	return { loading, error, handleSubmit };
}
