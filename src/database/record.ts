import { Temporal } from "temporal-polyfill";
import { err, Method, ok, Result, tryResult } from "../lib/utils";
import Database from "@tauri-apps/plugin-sql";
import Decimal from "decimal.js";

export const genRecord = (db: Database) => ({
	getByRange: async (
		start: number,
		end: number,
		orderBy: "DESC" | "ASC" = "DESC"
	): Promise<Result<"Aplikasi bermasalah", DB.Record[]>> => {
		return tryResult({
			run: () =>
				db.select<DB.Record[]>(
					`SELECT * FROM records 
					 WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp ${orderBy}`,
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
			method: Method;
			methodType: number | null;
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
						 pay, disc_val, disc_type, change, method_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
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
						data.methodType,
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
	toCredit: async (timestamp: number): Promise<"Aplikasi bermasalah" | null> => {
		const [errMsg] = await tryResult({
			run: () =>
				db.execute("UPDATE records SET credit = 1, pay = 0, change = 0 WHERE timestamp = $1", [
					timestamp,
				]),
		});
		return errMsg;
	},
	updateCreditPay: async (
		data: {
			pay: number;
			change: number;
			round: number;
			grandTotal: number;
		},
		timestamp: number
	): Promise<Result<"Aplikasi bermasalah", number>> => {
		const now = Temporal.Now.instant().epochMilliseconds;
		const [errMsg] = await tryResult({
			run: () =>
				db.execute(
					`UPDATE records SET pay = $1, change = $2, rounding = $3, grand_total = $4, 
					 credit = 0, timestamp = $5 WHERE timestamp = $6`,
					[
						data.pay,
						data.change,
						data.round,
						new Decimal(data.grandTotal).add(data.round).toNumber(),
						now,
						timestamp,
					]
				),
		});
		if (errMsg) return err(errMsg);
		return ok(now);
	},
	updateTimestamp: async (
		timestamp: number,
		newTime: number
	): Promise<Result<"Aplikasi bermasalah", number>> => {
		const [errMsg] = await tryResult({
			run: () =>
				db.execute("UPDATE records SET timestamp = $2 WHERE timestamp = $1", [timestamp, newTime]),
		});
		if (errMsg) return err(errMsg);
		return ok(newTime);
	},
	updateNoteAndMethod: async (
		timestamp: number,
		note: string,
		method: Method,
		methodType: number | null
	): Promise<"Aplikasi bermasalah" | null> => {
		const [errMsg] = await tryResult({
			run: () =>
				db.execute(
					"UPDATE records SET note = $1, method = $2, method_type = $3 WHERE timestamp = $4",
					[note, method, methodType, timestamp]
				),
		});
		return errMsg;
	},
	updateMode: async (
		record: DB.Record,
		items: DB.RecordItem[],
		mode: "buy" | "sell"
	): Promise<"Aplikasi bermasalah" | null> => {
		if (mode === record.mode || record.credit === 1) return null;
		const [errMsg] = await tryResult({
			run: async () => {
				await db.execute("UPDATE records SET mode = $1 WHERE timestamp = $2", [
					mode,
					record.timestamp,
				]);
				const sign = mode === "sell" ? "-" : "+";
				for (const item of items) {
					// TODO: SHOULD HAVE UPDATE THE CAPITALS
					if (item.product_id !== null) {
						await db.execute(`UPDATE products SET stock = stock ${sign} $1 WHERE id = $2`, [
							2 * item.qty,
							item.product_id,
						]);
					}
				}
			},
		});
		return errMsg;
	},
});
