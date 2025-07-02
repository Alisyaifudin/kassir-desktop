import { useAction } from "~/hooks/useAction";
import { Database } from "~/database";

export function useDeleteCashier(
	name: string,
	setOpen: (open: boolean) => void,
	revalidate: () => void,
	db: Database
) {
	const { action, loading, error, setError } = useAction("", (name: string) => {
		return db.cashier.del.byName(name);
	});
	const handleClick = async () => {
		const errMsg = await action(name);
		setError(errMsg);
		if (errMsg === null) {
			revalidate();
			setOpen(false);
		}
	};
	return { loading, error, handleClick };
}
