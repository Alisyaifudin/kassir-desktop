import { z } from "zod";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";

const defaultMethod = { id: 1000, method: "cash" as const, name: null };

export function useSelectMethod(
	timestamp: number,
	methods: DB.Method[],
	close: () => void,
	revalidate: () => void,
	context: { db: Database }
) {
	const db = context.db;
	const { action, error, loading, setError } = useAction("", (methodId: number) =>
		db.record.update.method(timestamp, methodId)
	);
	async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
		const val = e.currentTarget.value;
		const methodKind = z.enum(["cash", "transfer", "debit", "qris"]).catch("cash").parse(val);
		const methodId = (
			methods.find((m) => m.method === methodKind && m.name === null) ?? defaultMethod
		).id;
		const errMsg = await action(methodId);
		setError(errMsg);
		if (errMsg === null) {
			revalidate();
		}
	}

	async function handleChangeSub(e: React.ChangeEvent<HTMLSelectElement>) {
		const parsed = z.coerce.number().int().safeParse(e.currentTarget.value);
		if (!parsed.success) return;
		const id = parsed.data;
		const errMsg = await action(id);
		setError(errMsg);
		if (errMsg === null) {
			revalidate();
			close();
		}
	}
	return { error, loading, handleChange, handleChangeSub };
}
