import { SetURLSearchParams } from "react-router";
import { Temporal } from "temporal-polyfill";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";

export function useDel(
	timestamp: number,
	setOpen: (open: boolean) => void,
	setSearch: SetURLSearchParams,
	revalidate: () => void,
	db: Database
) {
	const { loading, error, setError, action } = useAction("", (timestamp: number) =>
		db.money.del.byTimestamp(timestamp)
	);
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const errMsg = await action(timestamp);
		setError(errMsg);
		if (errMsg === null) {
			const now = Temporal.Now.instant().epochMilliseconds;
			setSearch((prev) => ({
				time: now.toString(),
				kind: prev.get("kind") ?? "saving",
			}));
			setOpen(false);
			revalidate();
		}
	};
	return { loading, error, handleSubmit };
}
