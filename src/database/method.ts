import Database from "@tauri-apps/plugin-sql";
import { err, ok, Result, tryResult } from "../lib/utils";

export function genMethod(db: Database) {
	let cache: DB.Method[] = [];
	return {
		get: {
			async all(): Promise<Result<"Aplikasi bermasalah", DB.Method[]>> {
				if (cache.length > 0) return ok(cache);
				const [errMsg, res] = await tryResult({
					run: () => db.select<DB.Method[]>("SELECT * FROM methods ORDER BY id"),
				});
				if (errMsg) return err(errMsg);
				cache = res;
				return ok(res);
			},
		},
		add: {
			async one(name: string, method: DB.MethodEnum): Promise<"Aplikasi bermasalah" | null> {
				const [errMsg] = await tryResult({
					run: () =>
						db.execute("INSERT INTO methods (name, method) VALUES ($1, $2)", [name, method]),
				});
				if (errMsg === null) {
					cache = [];
				}
				return errMsg;
			},
		},
		update: {
			async one(id: number, name: string): Promise<"Aplikasi bermasalah" | null> {
				const [errMsg] = await tryResult({
					run: () => db.execute("UPDATE methods SET name = $1 WHERE id = $2", [name, id]),
				});
				if (errMsg === null) {
					cache = [];
				}
				return errMsg;
			},
		},
		del: {
			async byId(id: number): Promise<"Aplikasi bermasalah" | null> {
				const [errMsg] = await tryResult({
					run: () => db.execute("DELETE FROM methods WHERE id = $1", [id]),
				});
				if (errMsg === null) {
					cache = [];
				}
				return errMsg;
			},
		},
	};
}
