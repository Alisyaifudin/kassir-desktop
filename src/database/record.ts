import { err, ok, Result, tryResult } from "../lib/utils";
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
	getByTime: async (
		timestamp: number
	): Promise<Result<"Aplikasi bermasalah", DB.Record | null>> => {
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
			cashier: string | null;
			credit: 0 | 1;
			total: number;
			rounding: number | null;
			grand_total: number;
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
					`INSERT INTO records 
						(mode, timestamp, grand_total, pay, disc_val, disc_type, change, total, rounding, credit, cashier)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
					[
						mode,
						timestamp,
						data.grand_total,
						data.pay,
						data.disc.value,
						data.disc.type,
						data.change,
						data.total,
						data.rounding,
						data.credit,
						data.cashier,
					]
				),
		});
		if (errMsg) return errMsg;
		if (res.lastInsertId === undefined) return "Gagal menambahkan catatan";
		return null;
	},
	delete: async (timestamp: number): Promise<"Aplikasi bermasalah" | null> => {
		const [errMsg] = await tryResult({
			run: () => db.execute("DELETE FROM records WHERE timestamp = $1", [timestamp]),
		});
		return errMsg;
	},
	updateCreditPay: async (
		pay: number,
		timestamp: number
	): Promise<"Aplikasi bermasalah" | null> => {
		const [errMsg] = await tryResult({
			run: () =>
				db.execute("UPDATE records SET pay = $1, credit = 0 WHERE timestamp = $2", [
					pay,
					timestamp,
				]),
		});
		return errMsg;
	},
});
