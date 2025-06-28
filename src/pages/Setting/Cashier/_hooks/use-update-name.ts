import { z } from "zod";
import { useAction } from "~/hooks/useAction";
import { useDB } from "~/RootLayout";

export function useUpdateName(name: string) {
	const db = useDB();
	const { loading, action, error, setError } = useAction(
		"",
		(name: { old: string; new: string }) => {
			return db.cashier.updateName(name.old, name.new);
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
  return {loading, error, handleSubmit}
}
