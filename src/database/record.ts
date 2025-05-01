import { err, ok, Result, tryResult } from "../lib/utils";
import Database from "@tauri-apps/plugin-sql";

export const genRecord = (db: Database) => ({
	getByRange: async (
		start: number,
		end: number
	): Promise<Result<"Aplikasi bermasalah", DB.Record[]>> => {
		return tryResult({
			run: () =>
				db.select<DB.Record[]>(
					`SELECT * FROM records 
					 WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp DESC`,
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
			totalBeforeDisc: number;
			totalAfterDisc: number;
			totalAfterTax: number;
			totalTax: number;
			grandTotal: number;
			note: string;
			method: "cash" | "transfer" | "emoney";
			rounding: number | null;
			pay: number;
			disc: {
				value: number | null;
				type: "number" | "percent" | null;
			};
			change: number;
		}
	): Promise<"Aplikasi bermasalah" | null> => {
		const [errMsg] = await tryResult({
			run: () =>
				db.execute(
					`INSERT INTO records 
						(mode, timestamp, cashier, credit, total_before_disc, total_after_disc,
						 total_after_tax, total_tax, grand_total, note, method, rounding,
						 pay, disc_val, disc_type, change)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
					[
						mode,
						timestamp,
						data.cashier,
						data.credit,
						data.totalBeforeDisc,
						data.totalAfterDisc,
						data.totalAfterTax,
						data.totalTax,
						data.grandTotal,
						data.note,
						data.method,
						data.rounding,
						data.pay,
						data.disc.value,
						data.disc.type,
						data.change,
					]
				),
		});
		if (errMsg) return errMsg;
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
