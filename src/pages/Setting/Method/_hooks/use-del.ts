import { useAction } from "~/hooks/useAction";
import { Database } from "~/database";

export function useDel(
	method: DB.Method,
	setOpen: (open: boolean) => void,
	revalidate: () => void,
	db: Database
) {
	const { loading, error, setError, action } = useAction("", () => db.method.del.byId(method.id));
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const errMsg = await action();
		setError(errMsg);
		if (errMsg === null) {
			setOpen(false);
			revalidate();
		}
	};
	return { loading, error, handleSubmit };
}
