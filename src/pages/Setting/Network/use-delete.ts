import { deleteAllProduct } from "~/dal/delete-products";
import { useAction } from "~/hooks/useAction";
import { tryResult } from "~/lib/utils";
import { useStore } from "~/layouts/RootLayout";

export function useDelete() {
	const store = useStore();
	const { error, loading, setError, action } = useAction("", async () => {
		const [errInfo, res] = await tryResult({
			run: async () => {
				const [token, url] = await Promise.all([store.core.get("token"), store.core.get("url")]);
				if (typeof token !== "string" || typeof url !== "string") {
					return { token: null, url: null };
				}
				return { token, url };
			},
		});
		if (errInfo) return errInfo;
		const { token, url } = res;
		if (token === null) return "Unauthorized";
		const [errMsg, newToken] = await deleteAllProduct(token, url);
		if (errMsg) return errMsg;
		store.core.set("token", newToken);
		return null;
	});
	const handleClick = async () => {
		const errMsg = await action();
		setError(errMsg);
		return errMsg;
	};
	return { error, loading, handleClick };
}
