import { z } from "zod";
import { useAction } from "~/hooks/useAction";
import { Database } from "~/database";
import { auth } from "~/lib/auth";

export function useNewCashier(
	setOpen: (open: boolean) => void,
	revalidate: () => void,
	db: Database
) {
	const { action, loading, error, setError } = useAction("", async (name: string) => {
		const [errMsg, hash] = await auth.hash("");
		if (errMsg) return errMsg;
		return db.cashier.add.one(name, "user", hash);
	});
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z.string().safeParse(formData.get("name"));
		if (!parsed.success) {
			setError(parsed.error.flatten().formErrors.join("; "));
			return;
		}
		const name = parsed.data;
		const errMsg = await action(name);
		setError(errMsg);
		if (errMsg === null) {
			setOpen(false);
			revalidate();
		}
	};
	return { loading, error, handleSubmit };
}
