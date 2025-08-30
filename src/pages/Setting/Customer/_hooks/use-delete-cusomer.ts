import { useAction } from "~/hooks/useAction";
import { Database } from "~/database";

export function useDeleteCustomer(
	phone: string,
	setOpen: (open: boolean) => void,
	revalidate: () => void,
	db: Database
) {
	const { action, loading, error, setError } = useAction("", (phone: string) => {
		return db.customer.del.byPhone(phone);
	});
	const handleClick = async () => {
		const errMsg = await action(phone);
		setError(errMsg);
		if (errMsg === null) {
			revalidate();
			setOpen(false);
		}
	};
	return { loading, error, handleClick };
}
