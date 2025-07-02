import { z } from "zod";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";

export function useUpdateName(name: string, db: Database) {
	const { loading, action, error, setError } = useAction(
		"",
		(name: { old: string; new: string }) => {
			return db.cashier.update.name(name.old, name.new);
		}
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z.object({ newName: z.string() }).safeParse({ newName: formData.get("name") });
		if (!parsed.success) {
			setError(parsed.error.flatten().fieldErrors.newName?.join("; ") ?? "Ada yang salah");
			return;
		}
		const { newName } = parsed.data;
		const errMsg = await action({ old: name, new: newName });
		setError(errMsg);
	};
	return { loading, error, handleSubmit };
}
