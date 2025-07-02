import { z } from "zod";
import { useAction } from "~/hooks/useAction";
import { Database } from "~/database";

export function useUpdateRole(name: string, revalidate: () => void, db: Database) {
	const { error, loading, setError, action } = useAction(
		"",
		(cashier: { name: string; role: "admin" | "user" }) => {
			return db.cashier.update.role(cashier.name, cashier.role);
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
			revalidate();
		}
	};
	return { loading, error, handleChangeRole };
}
