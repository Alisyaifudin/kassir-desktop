import { z } from "zod";
import { useAction } from "~/hooks/useAction";
import { emitter } from "~/lib/event-emitter";
import { useDB } from "~/RootLayout";
import { FETCH_CASHIER } from "./use-cashier";

export function useUpdateRole(name: string) {
	const db = useDB();
	const { error, loading, setError, action } = useAction(
		"",
		(cashier: { name: string; role: "admin" | "user" }) => {
			return db.cashier.updateRole(cashier.name, cashier.role);
		}
	);
	const handleChangeRole = async (e: React.ChangeEvent<HTMLSelectElement>) => {
		const parsed = z.enum(["admin", "user"]).safeParse(e.currentTarget.value);
		if (!parsed.success) {
			setError(parsed.error.flatten().formErrors.join("; "));
			return;
		}
		const newRole = parsed.data;
		const errMsg = await action({ name: name, role: newRole });
		setError(errMsg);
		if (errMsg === null) {
			emitter.emit(FETCH_CASHIER);
		}
	};
	return { loading, error, handleChangeRole };
}
