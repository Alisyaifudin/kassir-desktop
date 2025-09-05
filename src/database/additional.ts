import Database from "@tauri-apps/plugin-sql";
import { err, ok, Result, tryResult } from "../lib/utils";
import { AdditionalItemTable } from "./additional-item";

export function genAdditional(db: Database) {
	return {
		get: get(db),
		add: add(db),
		del: del(db),
	};
}

function get(db: Database) {
	return {
		async byRange(
			start: number,
			end: number
		): Promise<Result<"Aplikasi bermasalah", DB.Additional[]>> {
			return tryResult({
				run: () =>
					db.select<DB.Additional[]>(
						"SELECT * FROM additionals WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp DESC",
						[start, end]
					),
			});
		},
		async byTimestamp(timestamp: number): Promise<Result<"Aplikasi bermasalah", DB.Additional[]>> {
			const [errMsg, items] = await tryResult({
				run: () =>
					db.select<DB.Additional[]>("SELECT * FROM additionals WHERE timestamp = $1", [timestamp]),
			});
			if (errMsg) return err(errMsg);
			return ok(items);
		},
	};
}

function add(db: Database) {
	const itemsTable = new AdditionalItemTable(db);
	return {
		async many(
			timestamp: number,
			additionals: { name: string; value: number; kind: DB.ValueKind; saved: boolean }[]
		): Promise<Result<"Aplikasi bermasalah", number[]>> {
			const [errMsg, res] = await tryResult({
				run: async () => {
					const promises = [];
					for (const additional of additionals) {
						if (additional.saved) {
							let id = null as null | number;
							const [errItem, res] = await itemsTable.add.one({ ...additional });
							if (!errItem && res !== null) {
								id = res;
							}
							promises.push(
								db.execute(
									`INSERT INTO additionals (timestamp, name, value, kind, item_id) 
                 VALUES ($1, $2, $3, $4, $5)`,
									[timestamp, additional.name.trim(), additional.value, additional.kind, id]
								)
							);
							continue;
						}
						promises.push(
							db.execute(
								`INSERT INTO additionals (timestamp, name, value, kind) 
                 VALUES ($1, $2, $3, $4)`,
								[timestamp, additional.name.trim(), additional.value, additional.kind]
							)
						);
					}
					return Promise.all(promises);
				},
			});
			if (errMsg) return err(errMsg);
			const ids = res.map((r) => r.lastInsertId!);
			return ok(ids);
		},
	};
}

function del(db: Database) {
	return {
		async many(ids: number[]): Promise<"Aplikasi bermasalah" | null> {
			const [errMsg] = await tryResult({
				run: () => {
					const promises = [];
					for (const id of ids) {
						promises.push(db.execute(`DELETE FROM additionals WHERE id = $1`, [id]));
					}
					return Promise.all(promises);
				},
			});
			return errMsg;
		},
	};
}
