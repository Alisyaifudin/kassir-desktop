import { getSession } from "~/dal/get-session";
import { useAsync } from "~/hooks/useAsync";
import { err, ok, Result, tryResult } from "~/lib/utils";
import { Store } from "~/store";

export function useConnect(store: Store) {
	const state = useAsync(async (): Promise<Result<"Aplikasi bermasalah", boolean>> => {
		const [errInfo, info] = await tryResult({
			run: () => Promise.all([store.core.get("token"), store.core.get("url")]),
		});
		if (errInfo) {
			return err("Aplikasi bermasalah")
		}
		const [token, url] = info;
		if (typeof token !== "string" || typeof url !== "string" || token === "") {
			return ok(false);
		}
		const [errMsg, res] = await getSession(token, url);
		if (errMsg) {
			return err("Aplikasi bermasalah")
		}
		const { token: newToken } = res;
		store.core.set("token", newToken);
		return ok(newToken !== null)
	}, ["fetch-connect"]);
	return state;
}
