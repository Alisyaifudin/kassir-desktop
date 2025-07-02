import { z } from "zod";
import { useAction } from "~/hooks/useAction";
import { Database } from "~/database";
import { User } from "~/lib/auth";

export function useEditPassword(context: { user: User; db: Database }) {
	const { user, db } = context;
	const { setError, error, loading, action } = useAction("", async (password: string) => {
		return await db.cashier.update.password(user.name, password);
	});
	const handleChange = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z.string().safeParse(formData.get("password"));
		if (!parsed.success) {
			setError(parsed.error.flatten().formErrors.join("; "));
			return;
		}
		const newPassword = parsed.data;
		const errMsg = await action(newPassword);
		if (errMsg) {
			setError(errMsg);
			return;
		}
	};
	return { error, loading, handleChange };
}
