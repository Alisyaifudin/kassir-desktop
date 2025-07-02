import { NavigateFunction } from "react-router";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";
import { image } from "~/lib/image";
import { getBackURL } from "~/lib/utils";

export function useDelete(id: number, navigate: NavigateFunction, db: Database) {
	const { action, loading, error, setError } = useAction("", async (id: number) => {
		const [errDel, images] = await db.product.del.byId(id);
		if (errDel) return errDel;
		const promises: Promise<"Aplikasi bermasalah" | null>[] = [];
		for (const img of images) {
			promises.push(image.del(img));
		}
		const errMsgs = await Promise.all(promises);
		for (const errMsg of errMsgs) {
			if (errMsg) return errMsg;
		}
		return null;
	});
	const backURL = getBackURL("/stock", new URLSearchParams(window.location.search));
	const handleClick = async () => {
		const errMsg = await action(id);
		setError(errMsg);
		if (errMsg === null) {
			navigate(backURL);
		}
	};
	return { loading, error, handleClick };
}
