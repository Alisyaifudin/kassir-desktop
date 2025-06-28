import Database from "@tauri-apps/plugin-sql";
import { Result, tryResult } from "../lib/utils";

export function genMethod(db: Database) {
	return {
		get: {
			async all(): Promise<Result<"Aplikasi bermasalah", DB.Method[]>> {
				return tryResult({
					run: () => db.select<DB.Method[]>("SELECT * FROM methods"),
				});
			},
		},
		add: {
			async one(name: string, method: DB.MethodEnum): Promise<"Aplikasi bermasalah" | null> {
				const [errMsg] = await tryResult({
					run: () =>
						db.execute("INSERT INTO methods (name, method) VALUES ($1, $2)", [name, method]),
				});
				return errMsg;
			},
		},
		update: {
			async one(id: number, name: string): Promise<"Aplikasi bermasalah" | null> {
				const [errMsg] = await tryResult({
					run: () => db.execute("UPDATE methods SET name = $1 WHERE id = $2", [name, id]),
				});
				return errMsg;
			},
		},
		del: {
			async byId(id: number): Promise<"Aplikasi bermasalah" | null> {
				const [errMsg] = await tryResult({
					run: () => db.execute("DELETE FROM methods WHERE id = $1", [id]),
				});
				return errMsg;
			},
		},
	};
}
