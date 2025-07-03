import { useState } from "react";
import { NavigateFunction } from "react-router";
import { z } from "zod";
import { Database } from "~/database";
import { CashierWithoutPassword } from "~/database/cashier";
import { useAction } from "~/hooks/useAction";
import { auth } from "~/lib/auth";
import { Store } from "~/lib/store";

export function useLogin(
	cashiers: CashierWithoutPassword[],
	navigate: NavigateFunction,
	context: { db: Database; store: Store }
) {
	const [selected, setSelected] = useState<{ name: string; role: "admin" | "user" } | null>(null);
	const { db, store } = context;
	const { action, setError, error, loading } = useAction(
		"",
		async (vars: { password: string; name: string }) => {
			const [errHash, hash] = await db.cashier.get.hash(vars.name);
			if (errHash) {
				return errHash;
			}
			const errPass = await auth.verify(vars.password, hash);
			if (errPass) {
				return errPass;
			}
			return null;
		}
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		if (selected === null) {
			return;
		}
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		setError(null);
		const parsed = z.string().safeParse(formData.get("password"));
		if (!parsed.success) {
			const errs = parsed.error.flatten().formErrors;
			setError(errs.join("; ") ?? "");
			return;
		}
		const password = parsed.data;
		const errMsg = await action({ password, name: selected.name });
		if (errMsg !== null) {
			setError(errMsg);
			return;
		}
		const errStore = await auth.store(store, selected);
		if (errStore) {
			setError(errStore);
			return;
		}
		navigate("/setting");
	};
	const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const user = cashiers.find((c) => c.name === e.currentTarget.value);
		if (!user) {
			setSelected(null);
			return;
		}
		setSelected(user);
	};
	return { loading, error, handleSubmit, handleSelect, selected };
}
