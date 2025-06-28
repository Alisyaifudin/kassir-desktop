import { z } from "zod";
import { useAction } from "~/hooks/useAction";
import { emitter } from "~/lib/event-emitter";
import { useDB } from "~/RootLayout";
import { FETCH_CASHIER } from "./use-cashier";

export function useNewCashier(setOpen: (open: boolean) => void) {
	const db = useDB();
	const { action, loading, error, setError } = useAction("", (name: string) =>
		db.cashier.add(name, "user")
	);
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
			emitter.emit(FETCH_CASHIER);
		}
	};
	return { loading, error, handleSubmit };
}
