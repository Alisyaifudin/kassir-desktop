import { z } from "zod";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";

export function useSelectMethod(
	timestamp: number,
	close: () => void,
	revalidate: () => void,
	context: { db: Database }
) {
	const db = context.db;
	const { action, error, loading, setError } = useAction("", (methodId: number) =>
		db.record.update.method(timestamp, methodId)
	);
	function handleChange(closeAfter: boolean = false) {
		return async function (e: React.ChangeEvent<HTMLSelectElement>) {
			const parsed = z.coerce.number().int().safeParse(e.currentTarget.value);
			if (!parsed.success) return;
			const id = parsed.data;
			const errMsg = await action(id);
			setError(errMsg);
			if (errMsg === null) {
				revalidate();
				if (closeAfter) close();
			}
		};
	}
	return { error, loading, handleChange };
}
