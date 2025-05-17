import Database from "@tauri-apps/plugin-sql";
import { Result, tryResult } from "../lib/utils";
import { Temporal } from "temporal-polyfill";

export function genMoney(db: Database) {
	return {
		get: async (start: number, end: number): Promise<Result<"Aplikasi bermasalah", DB.Money[]>> => {
			return tryResult({
				run: () =>
					db.select<DB.Money[]>(
						"SELECT * FROM money WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp DESC",
						[start, end]
					),
			});
		},
		insert: async (value: number, kind: "saving"|"debt"): Promise<"Aplikasi bermasalah" | null> => {
			const now = Temporal.Now.instant().epochMilliseconds;
			const [errMsg] = await tryResult({
				run: () => db.execute("INSERT INTO money (timestamp, value, kind) VALUES ($1, $2, $3)", [now, value, kind]),
			});
			return errMsg;
		},
		delete: async (timestamp: number): Promise<"Aplikasi bermasalah" | null> => {
			const [errMsg] = await tryResult({
				run: () => db.execute("DELETE FROM money WHERE timestamp = $1", [timestamp]),
			});
			return errMsg;
		},
	};
}
