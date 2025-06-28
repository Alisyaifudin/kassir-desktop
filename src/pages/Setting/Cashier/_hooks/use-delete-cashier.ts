import { emitter } from "~/lib/event-emitter";
import { FETCH_CASHIER } from "./use-cashier";
import { useAction } from "~/hooks/useAction";
import { useDB } from "~/RootLayout";

export function useDeleteCashier(name: string, setOpen: (open: boolean) => void) {
	const db = useDB();
	const { action, loading, error, setError } = useAction("", (name: string) => {
		return db.cashier.delete(name);
	});
	const handleClick = async () => {
		const errMsg = await action(name);
		setError(errMsg);
		if (errMsg === null) {
			emitter.emit(FETCH_CASHIER);
			setOpen(false);
		}
	};
	return { loading, error, handleClick };
}
