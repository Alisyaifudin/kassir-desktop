import { downloadAllProduct } from "~/dal/pull-products";
import { useAction } from "~/hooks/useAction";
import { tryResult } from "~/lib/utils";
import { useDB, useStore } from "~/RootLayout";

export function useDownload() {
	const db = useDB();
	const store = useStore();
	const { error, loading, setError, action } = useAction("", async () => {
		const [errInfo, info] = await tryResult({
			run: async () => {
				const [token, url] = await Promise.all([store.core.get("token"), store.core.get("url")]);
				if (typeof token !== "string" || typeof url !== "string") {
					return { token: null, url: null };
				}
				return { token, url };
			},
		});
		if (errInfo) return errInfo;
		const { token, url } = info;
		if (token === null) return "Unauthorized";
		const [errDown, res] = await downloadAllProduct(token, url);
		if (errDown) return errDown;
		const { token: newToken, products } = res;
		const promises: Promise<"Aplikasi bermasalah" | null>[] = [];
		for (const p of products) {
			promises.push(db.product.upsertServer(p));
		}
		const promRes = await Promise.all(promises);
		for (const errMsg of promRes) {
			if (errMsg) return errMsg;
		}
		store.core.set("token", newToken);
		return null;
	});
	const handleClick = async () => {
		const errMsg = await action();
		setError(errMsg);
	};
	return { error, loading, handleClick };
}
