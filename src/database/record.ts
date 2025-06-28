import { Temporal } from "temporal-polyfill";
import { err, ok, Result, tryResult } from "../lib/utils";
import Database from "@tauri-apps/plugin-sql";
import { calcCapital, generateRecordSummary } from "~/lib/record";

export const genRecord = (db: Database) => ({
	get: get(db),
	add: add(db),
	del: {
		async byTimestamp(timestamp: number): Promise<"Aplikasi bermasalah" | null> {
			const [errMsg] = await tryResult({
				run: () => db.execute("DELETE FROM records WHERE timestamp = $1", [timestamp]),
			});
			return errMsg;
		},
	},
	update: update(db),
});

function get(db: Database) {
	return {
		async byRange(
			start: number,
			end: number,
			orderBy: "DESC" | "ASC" = "DESC"
		): Promise<Result<"Aplikasi bermasalah", DB.Record[]>> {
			return tryResult({
				run: () =>
					db.select<DB.Record[]>(
						`SELECT * FROM records 
					   WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp ${orderBy}`,
						[start, end]
					),
			});
		},
		async byTimestamp(timestamp: number): Promise<Result<"Aplikasi bermasalah", DB.Record | null>> {
			const [errMsg, records] = await tryResult({
				run: () =>
					db.select<DB.Record[]>("SELECT * FROM records WHERE timestamp = $1", [timestamp]),
			});
			if (errMsg) return err(errMsg);
			if (records.length === 0) return ok(null);
			return ok(records[0]);
		},
	};
}

function add(db: Database) {
	return {
		async one(data: {
			timestamp: number;
			discValue: number;
			discKind: DB.ValueKind;
			rounding: number;
			credit: 0 | 1;
			cashier: string;
			mode: DB.Mode;
			pay: number;
			note: string;
			methodId: number;
		}): Promise<"Aplikasi bermasalah" | null> {
			const [errMsg] = await tryResult({
				run: () =>
					db.execute(
						`INSERT INTO records 
						(mode, timestamp, paid_at, cashier, credit, note, rounding, pay, 
						 disc_val, disc_type, method_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
						[
							data.mode,
							data.timestamp,
							data.timestamp,
							data.cashier,
							data.credit,
							data.note,
							data.rounding,
							data.pay,
							data.discValue,
							data.discKind,
							data.methodId,
						]
					),
			});
			if (errMsg) return errMsg;
			return null;
		},
	};
}

function update(db: Database) {
	return {
		async toCredit(timestamp: number): Promise<"Aplikasi bermasalah" | null> {
			const [errMsg] = await tryResult({
				run: () =>
					db.execute("UPDATE records SET credit = 1, pay = 0, rounding = 0, WHERE timestamp = $1", [
						timestamp,
					]),
			});
			return errMsg;
		},
		payCredit: async (data: {
			timestamp: number;
			pay: number;
			rounding: number;
		}): Promise<Result<"Aplikasi bermasalah", number>> => {
			const now = Temporal.Now.instant().epochMilliseconds;
			const [errMsg] = await tryResult({
				run: () =>
					db.execute(
						`UPDATE records SET pay = $1, rounding = $2, credit = 0, paid_at = $3 WHERE timestamp = $4`,
						[data.pay, data.rounding, now, data.timestamp]
					),
			});
			if (errMsg) return err(errMsg);
			return ok(now);
		},
		timestamp: async (
			timestamp: number,
			newTime: number
		): Promise<Result<"Aplikasi bermasalah", number>> => {
			const [errMsg] = await tryResult({
				run: () =>
					db.execute("UPDATE records SET timestamp = $2 WHERE timestamp = $1", [
						timestamp,
						newTime,
					]),
			});
			if (errMsg) return err(errMsg);
			return ok(newTime);
		},
		noteAndMethod: async (
			timestamp: number,
			note: string,
			methodId: number
		): Promise<"Aplikasi bermasalah" | null> => {
			const [errMsg] = await tryResult({
				run: () =>
					db.execute("UPDATE records SET note = $1, method_id = $2 WHERE timestamp = $3", [
						note,
						methodId,
						timestamp,
					]),
			});
			return errMsg;
		},
		mode: async (
			record: DB.Record,
			items: DB.RecordItem[],
			additionals: DB.Additional[],
			discounts: DB.Discount[],
			mode: DB.Mode
		): Promise<"Aplikasi bermasalah" | null> => {
			if (mode === record.mode || record.credit === 1) return null;
			const summary = generateRecordSummary({ record, items, additionals, discounts });
			const { grandTotal, totalFromItems } = summary.record;
			let capitals: number[] = [];
			if (mode === "buy") {
				const totalQty =
					items.length === 0
						? 0
						: items.map((item) => item.qty).reduce((prev, curr) => prev + curr);
				capitals = summary.items.map((item) =>
					calcCapital(item, totalFromItems, grandTotal, totalQty)
				);
			}
			const [errMsg] = await tryResult({
				run: async () => {
					await db.execute("UPDATE records SET mode = $1 WHERE timestamp = $2", [
						mode,
						record.timestamp,
					]);
					const sign = mode === "sell" ? "-" : "+";
					const promises: Promise<any>[] = [];
					items.forEach((item, i) => {
						if (item.product_id !== null) {
							if (mode === "buy") {
								promises.push(
									db.execute(
										`UPDATE products SET stock = stock ${sign} $1, capital = $2 WHERE id = $3`,
										[2 * item.qty, capitals[i], item.product_id]
									),
									db.execute(`UPDATE record_items SET capital = $1 WHERE id = $2`, [
										capitals[i],
										item.id,
									])
								);
							} else {
								promises.push(
									db.execute(`UPDATE products SET stock = stock ${sign} $1 WHERE id = $2`, [
										2 * item.qty,
										item.product_id,
									])
								);
							}
						}
					});
				},
			});
			return errMsg;
		},
	};
}
