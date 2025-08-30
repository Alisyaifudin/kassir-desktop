import { z } from "zod";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";

export function useUpdateName(phone: string, db: Database) {
	const { loading, action, error, setError } = useAction("", (name: string) => {
		return db.customer.update.name(phone, name);
	});
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z.string().safeParse(formData.get("name"));
		if (!parsed.success) {
			setError(parsed.error.flatten().formErrors.join("; ") ?? "Ada yang salah");
			return;
		}
		const name = parsed.data;
		const errMsg = await action(name);
		setError(errMsg);
	};
	return { loading, error, handleSubmit };
}
