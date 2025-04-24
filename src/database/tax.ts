import Database from "@tauri-apps/plugin-sql";
import { err, ok, Result, tryResult } from "../utils";

export function genTax(db: Database) {
	return {
		getByRange: async (start: number, end: number): Promise<Result<string, DB.Tax[]>> => {
			return tryResult({
				run: () =>
					db.select<DB.Tax[]>(
						"SELECT * FROM taxes WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp DESC",
						[start, end]
					),
			});
		},
		getAllByTime: async (timestamp: number): Promise<Result<string, DB.Tax[]>> => {
			const [errMsg, items] = await tryResult({
				run: () => db.select<DB.Tax[]>("SELECT * FROM taxes WHERE timestamp = $1", [timestamp]),
			});
			if (errMsg) return err(errMsg);
			return ok(items);
		},
		add: async (
			taxes: { name: string; value: number }[],
			timestamp: number
		): Promise<string | null> => {
			const [errMsg] = await tryResult({
				run: () => {
					const promises = [];
					for (const tax of taxes) {
						promises.push(
							db.execute(
								`INSERT INTO taxes (timestamp, name, value) 
                 VALUES ($1, $2, $3)`,
								[timestamp, tax.name, tax.value]
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
