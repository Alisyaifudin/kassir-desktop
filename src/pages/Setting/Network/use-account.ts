import { z } from "zod";
import { useAction } from "~/hooks/useAction";
import { useAsync } from "~/hooks/useAsync";
import { emitter } from "~/lib/event-emitter";
import { err, ok, Result, tryResult } from "~/lib/utils";
import { Store } from "~/store";

export function useAccount(store: Store) {
	const state = useAsync(async (): Promise<
		Result<"Aplikasi bermasalah", { name: string; password: string }>
	> => {
		const [errMsg, account] = await tryResult({
			run: async () => {
				const name = await store.core.get("user-name");
				const password = await store.core.get("user-password");
				if (typeof name === "string" && typeof password === "string") {
					return { name, password };
				}
				return { name: "", password: "" };
			},
		});
		if (errMsg) return err(errMsg);
		return ok(account);
	}, ["fetch-connection"]);
	const { action, loading, error, setError } = useAction(
		"",
		async (data: { name: string; password: string }) => {
			try {
				await Promise.all([
					store.core.set("user-name", data.name),
					store.core.set("user-password", data.password),
				]);
				return null;
			} catch (error) {
				console.error(error);
				return "Aplikasi bermasalah";
			}
		}
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z
			.object({
				name: z.string(),
				password: z.string(),
			})
			.safeParse({
				name: formData.get("name"),
				password: formData.get("password"),
			});
		if (!parsed.success) {
			console.error(parsed.error);
			setError("Input bermasalah");
			return;
		}
		const errMsg = await action(parsed.data);
		setError(errMsg);
		if (errMsg === null) {
			emitter.emit("fetch-connection");
		}
	};
	return { state, handleSubmit, error, loading };
}
