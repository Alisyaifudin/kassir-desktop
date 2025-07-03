import { z } from "zod";
import { Database } from "~/database";
import { useAction } from "~/hooks/useAction";

export function useSelectMode(timestamp: number, close: ()=> void, context: {db: Database}) {
  const db = context.db;
	const { action, error, loading, setError } = useAction("", (mode: "buy" | "sell") =>
		db.record.update.mode(timestamp, mode)
	);
	const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
		const mode = z.enum(["buy", "sell"]).catch("sell").parse(e.currentTarget.value);
		const errMsg = await action(mode);
		setError(errMsg);
		if (errMsg === null) {
			close()
		}
	};
  return {loading, error, handleChange}
}
