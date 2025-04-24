import { err, ok, Result, tryResult } from "../utils";
import Database from "@tauri-apps/plugin-sql";

export const genRecord = (db: Database) => ({
	getByRange: async (start: number, end: number): Promise<Result<string, DB.Record[]>> => {
		return tryResult({
			run: () =>
				db.select<DB.Record[]>(
					"SELECT * FROM records WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp DESC",
					[start, end]
				),
		});
	},
	getByTime: async (timestamp: number): Promise<Result<string, DB.Record | null>> => {
		const [errMsg, records] = await tryResult({
			run: () => db.select<DB.Record[]>("SELECT * FROM records WHERE timestamp = $1", [timestamp]),
		});
		if (errMsg) return err(errMsg);
		if (records.length === 0) return ok(null);
		return ok(records[0]);
	},
	add: async (
		mode: "sell" | "buy",
		timestamp: number,
		data: {
			total: number;
			pay: number;
			disc: {
				value: number | null;
				type: "number" | "percent" | null;
			};
			change: number;
		}
	): Promise<string | null> => {
		const [errMsg, res] = await tryResult({
			run: () =>
				db.execute(
					`INSERT INTO records (mode, timestamp, total, pay, disc_val, disc_type, change)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
					[mode, timestamp, data.total, data.pay, data.disc.value, data.disc.type, data.change]
				),
		});
		if (errMsg) return errMsg;
		if (res.lastInsertId === undefined) return "Gagal menambahkan catatan";
		return null;
	},
});
