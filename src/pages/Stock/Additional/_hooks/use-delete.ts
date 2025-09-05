import { NavigateFunction } from "react-router";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";
import { getBackURL } from "~/lib/utils";

export function useDelete(id: number, navigate: NavigateFunction, db: Database) {
	const { action, loading, error, setError } = useAction("", async (id: number) => {
		const errDel = await db.additionalItem.del.byId(id);
		return errDel;
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
