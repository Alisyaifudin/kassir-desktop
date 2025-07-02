import { useNavigate } from "react-router";
import { useDB } from "~/hooks/use-db";
import { useAction } from "~/hooks/useAction";

export function useTime(timestamp: number) {
	const navigate = useNavigate();
	const db = useDB();
	const { action, error, loading, setError } = useAction("", (newTime: number) =>
		db.record.update.timestamp(timestamp, newTime)
	);
	const handleChange = async (newTime: number) => {
		const [errMsg, now] = await action(newTime);
		if (errMsg) {
			setError(errMsg);
			return;
		}
		setError("");
		await navigate(`/records/${now}?tab=detail`);
	};
	return { handleChange, error, loading };
}
