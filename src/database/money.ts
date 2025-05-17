import Database from "@tauri-apps/plugin-sql";
import { Result, tryResult } from "../lib/utils";
import { Temporal } from "temporal-polyfill";
import Decimal from "decimal.js";

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
		insertAbs: async (
			value: number,
			kind: "saving" | "debt"
		): Promise<"Aplikasi bermasalah" | null> => {
			const now = Temporal.Now.instant().epochMilliseconds;
			const [errMsg] = await tryResult({
				run: () =>
					db.execute("INSERT INTO money (timestamp, value, kind) VALUES ($1, $2, $3)", [
						now,
						value,
						kind,
					]),
			});
			return errMsg;
		},
		insertChange: async (
			value: number,
			kind: "saving" | "debt"
		): Promise<"Aplikasi bermasalah" | null> => {
			const now = Temporal.Now.instant().epochMilliseconds;
			const [errSelect, items] = await tryResult({
				run: () => db.select<DB.Money[]>("SELECT * FROM money ORDER BY timestamp DESC LIMIT 1"),
			});
			if (errSelect) return errSelect;
			let curr = 0;
			if (items.length > 0) {
				curr = items[0].value;
			}
			const [errMsg] = await tryResult({
				run: () =>
					db.execute("INSERT INTO money (timestamp, value, kind) VALUES ($1, $2, $3)", [
						now,
						new Decimal(curr).add(value).toNumber(),
						kind,
					]),
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
