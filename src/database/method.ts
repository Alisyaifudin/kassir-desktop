import Database from "@tauri-apps/plugin-sql";
import { Method, Result, tryResult } from "../lib/utils";

export function genMethod(db: Database) {
	return {
		get: async (): Promise<Result<"Aplikasi bermasalah", DB.MethodType[]>> => {
			return tryResult({
				run: () => db.select<DB.MethodType[]>("SELECT * FROM method_types"),
			});
		},
		insert: async (name: string, method: Method): Promise<"Aplikasi bermasalah" | null> => {
			const [errMsg] = await tryResult({
				run: () =>
					db.execute("INSERT INTO method_types (name, method) VALUES ($1, $2)", [name, method]),
			});
			return errMsg;
		},
		update: async (id: number, name: string): Promise<"Aplikasi bermasalah" | null> => {
			const [errMsg] = await tryResult({
				run: () =>
					db.execute("UPDATE method_types SET name = $1 WHERE id = $2", [name, id]),
			});
			return errMsg;
		},
		delete: async (id: number): Promise<"Aplikasi bermasalah" | null> => {
			const [errMsg] = await tryResult({
				run: () => db.execute("DELETE FROM method_types WHERE id = $1", [id]),
			});
			return errMsg;
		},
	};
}
