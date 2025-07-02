import { z } from "zod";
import { useAction } from "~/hooks/useAction";
import { auth, User } from "~/lib/auth";
import { Store } from "~/lib/store";
import { Database } from "~/database";

export function useEditName(context: { db: Database; store: Store; user: User }) {
	const { db, store, user } = context;
	const { error, loading, setError, action } = useAction("", async (name: string) => {
		const updated = { ...user, name };
		const [errMsg] = await Promise.all([
			db.cashier.update.name(user.name, name),
			auth.store(store, updated),
		]);
		return errMsg;
	});
	const handleChange = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z.string().safeParse(formData.get("name"));
		if (!parsed.success) {
			setError(parsed.error.flatten().formErrors.join("; "));
			return;
		}
		const newName = parsed.data;
		if (newName === "") {
			setError("Tidak boleh kosong");
			return;
		}
		const errMsg = await action(parsed.data);
		setError(errMsg);
	};
	return { error, loading, handleChange };
}
