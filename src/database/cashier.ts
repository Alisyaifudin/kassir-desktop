import Database from "@tauri-apps/plugin-sql";
import { tryResult } from "../lib/utils";

export function genChasier(db: Database) {
	return {
		get: async () => {
			return tryResult({
				run: () => db.select<DB.Cashier[]>("SELECT * FROM cashiers"),
			});
		},
		add: async (name: string): Promise<"Aplikasi bermasalah" | null> => {
			const [errMsg] = await tryResult({
				run: () => db.execute("INSERT INTO cashiers (name) VALUES ($1)", [name.trim()]),
			});
			if (errMsg) return errMsg;
			return null;
		},
		update: async (oldName: string, newName: string): Promise<"Aplikasi bermasalah" | null> => {
			const [errMsg] = await tryResult({
				run: () => db.execute("UPDATE cashiers SET name = $1 WHERE name = $2", [newName, oldName]),
			});
			if (errMsg) return errMsg;
			return null;
		},
		delete: async (name: string): Promise<"Aplikasi bermasalah" | null> => {
			const [errMsg] = await tryResult({
				run: () => db.execute("DELETE FROM cashiers WHERE name = $1", [name]),
			});
			if (errMsg) return errMsg;
			return null;
		},
	};
}
