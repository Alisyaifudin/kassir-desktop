import Database from "@tauri-apps/plugin-sql";
import { err, ok, Result, tryResult } from "../lib/utils";

export function genOther(db: Database) {
	return {
		getByRange: async (
			start: number,
			end: number
		): Promise<Result<"Aplikasi bermasalah", DB.Other[]>> => {
			return tryResult({
				run: () =>
					db.select<DB.Other[]>(
						"SELECT * FROM others WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp DESC",
						[start, end]
					),
			});
		},
		getAllByTime: async (timestamp: number): Promise<Result<"Aplikasi bermasalah", DB.Other[]>> => {
			const [errMsg, items] = await tryResult({
				run: () => db.select<DB.Other[]>("SELECT * FROM others WHERE timestamp = $1", [timestamp]),
			});
			if (errMsg) return err(errMsg);
			return ok(items);
		},
		add: async (
			others: { name: string; value: number; kind: "percent" | "number" }[],
			timestamp: number
		): Promise<"Aplikasi bermasalah" | null> => {
			const [errMsg] = await tryResult({
				run: () => {
					const promises = [];
					for (const other of others) {
						promises.push(
							db.execute(
								`INSERT INTO others (timestamp, name, value, kind) 
                 VALUES ($1, $2, $3, $4)`,
								[timestamp, other.name.trim(), other.value, other.kind]
							)
						);
					}
					return Promise.all(promises);
				},
			});
			if (errMsg) return errMsg;
			return null;
		},
	};
}
