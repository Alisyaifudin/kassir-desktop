import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";

export function useDel(
	id: number,
	setOpen: (open: boolean) => void,
	revalidate: () => void,
	db: Database
) {
	const { loading, error, setError, action } = useAction("", (id: number) =>
		db.social.del.byId(id)
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const errMsg = await action(id);
		setError(errMsg);
		if (errMsg === null) {
			setOpen(false);
			console.log("revalidating");
			revalidate();
		}
	};
	return { loading, error, handleSubmit };
}
