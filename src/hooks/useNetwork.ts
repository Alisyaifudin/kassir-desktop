import { Store } from "~/store";
import { useAsync } from "./useAsync";
import { useAction } from "./useAction";
import { err, ok, Result, tryResult } from "~/lib/utils";
import { z } from "zod";

export function useNetwork(store: Store) {
	const state = useAsync(async (): Promise<Result<"Aplikasi bermasalah", string>> => {
		const [errMsg, network] = await tryResult({
			run: () => store.core.get("network"),
		});
		if (errMsg) return err(errMsg);
		if (typeof network === "string") {
			return ok(network);
		}
		return ok("");
	}, ["fetch-network"]);
	const { action, loading, error, setError } = useAction("", async (v: string) => {
		const [errMsg] = await tryResult({
			run: () => store.core.set("network", v),
		});
		return errMsg;
	});
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const parsed = z.string().safeParse(formData.get("network"));
		if (!parsed.success) {
			console.error(parsed.error);
			setError("Input bermasalah");
			return;
		}
		const errMsg = await action(parsed.data);
		setError(errMsg);
	};
	return { state, handleSubmit, error, loading };
}
