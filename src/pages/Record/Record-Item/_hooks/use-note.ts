import { z } from "zod";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";

export function useNote(timestamp: number, close: () => void, context: { db: Database }) {
	const db = context.db;
	const { action, loading, error, setError } = useAction("", (note: string) =>
		db.record.update.note(timestamp, note)
	);
	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const formEl = e.currentTarget;
		const formData = new FormData(formEl);
		const note = z.string().nullable().catch(null).parse(formData.get("note"));
		if (note === null) return;
		const errMsg = await action(note);
		setError(errMsg);
		if (errMsg === null) close();
		formEl.reset();
	}
	return { loading, error, handleSubmit };
}
