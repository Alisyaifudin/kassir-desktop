import Database from "@tauri-apps/plugin-sql";
import { Result, tryResult } from "../lib/utils";

export function genSocial(db: Database) {
	return {
		get: {
			async all(): Promise<Result<"Aplikasi bermasalah", DB.Social[]>> {
				return tryResult({
					run: () => db.select<DB.Social[]>("SELECT * FROM socials"),
				});
			},
		},
		add: {
			async one(name: string, value: string): Promise<"Aplikasi bermasalah" | null> {
				const [errMsg] = await tryResult({
					run: () => db.execute("INSERT INTO socials (name, value) VALUES ($1, $2)", [name, value]),
				});
				return errMsg;
			},
		},
		update: {
			async one(id: number, name: string, value: string): Promise<"Aplikasi bermasalah" | null> {
				const [errMsg] = await tryResult({
					run: () =>
						db.execute("UPDATE socials SET name = $1, value = $2 WHERE id = $3", [name, value, id]),
				});
				return errMsg;
			},
		},
		del: {
			async byId(id: number): Promise<"Aplikasi bermasalah" | null> {
				const [errMsg] = await tryResult({
					run: () => db.execute("DELETE FROM socials WHERE id = $1", [id]),
				});
				return errMsg;
			},
		},
	};
}
