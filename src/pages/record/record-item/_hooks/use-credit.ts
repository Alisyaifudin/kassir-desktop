import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";

export function useCredit(
	timestamp: number,
	close: () => void,
	context: { db: Database }
) {
	const db = context.db;
	const { loading, error, setError, action } = useAction("", (timestamp: number) =>
		db.record.update.toCredit(timestamp)
	);
	const handleClick = async () => {
		const errMsg = await action(timestamp);
		setError(errMsg);
		if (errMsg === null) {
			close();
		}
	};
	return { loading, error, handleClick };
}
