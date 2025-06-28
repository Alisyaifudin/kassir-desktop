import Database from "@tauri-apps/plugin-sql";
import { Result, tryResult } from "../lib/utils";
import { Temporal } from "temporal-polyfill";
import Decimal from "decimal.js";

export function genMoney(db: Database) {
	return {
		get: {
			async byRange(
				start: number,
				end: number
			): Promise<Result<"Aplikasi bermasalah", DB.Money[]>> {
				return tryResult({
					run: () =>
						db.select<DB.Money[]>(
							"SELECT * FROM money WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp DESC",
							[start, end]
						),
				});
			},
		},
		add: add(db),
		del: {
			async byTimestamp(timestamp: number): Promise<"Aplikasi bermasalah" | null> {
				const [errMsg] = await tryResult({
					run: () => db.execute("DELETE FROM money WHERE timestamp = $1", [timestamp]),
				});
				return errMsg;
			},
		},
	};
}

function add(db: Database) {
	return {
		async abs(
			value: number,
			kind: "saving" | "debt" | "diff"
		): Promise<"Aplikasi bermasalah" | null> {
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
		async change(
			value: number,
			kind: "saving" | "debt" | "diff"
		): Promise<"Aplikasi bermasalah" | null> {
			const now = Temporal.Now.instant().epochMilliseconds;
			const [errSelect, items] = await tryResult({
				run: () =>
					db.select<DB.Money[]>(
						"SELECT * FROM money WHERE kind = $1 ORDER BY timestamp DESC LIMIT 1",
						[kind]
					),
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
	};
}
