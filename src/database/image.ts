import Database from "@tauri-apps/plugin-sql";
import { Result, tryResult } from "../lib/utils";

export function genImage(db: Database) {
	return {
		getImages: async (productId: number): Promise<Result<"Aplikasi bermasalah", DB.Image[]>> => {
			return tryResult({
				run: () =>
					db.select<DB.Image[]>("SELECT * FROM images WHERE product_id = $1 ORDER BY id", [
						productId,
					]),
			});
		},
		swap: async (a: number, b: number): Promise<"Aplikasi bermasalah" | null> => {
			const [errMsg] = await tryResult({
				run: () =>
					db.execute(
						`UPDATE images SET id = -1 WHERE id = $1;
						 UPDATE images SET id = $1 WHERE id = $2;
						 UPDATE images SET id = $2 WHERE id = -1;`,
						[a, b]
					),
			});
			return errMsg;
		},
		insert: async (
			name: string,
			mime: DB.Image["mime"],
			productId: number
		): Promise<"Aplikasi bermasalah" | null> => {
			const [errMsg] = await tryResult({
				run: () =>
					db.execute("INSERT INTO images (name, mime, product_id) VALUES ($1, $2, $3)", [
						name,
						mime,
						productId,
					]),
			});
			return errMsg;
		},
		delete: async (id: number): Promise<"Aplikasi bermasalah" | null> => {
			const [errMsg] = await tryResult({
				run: () => db.execute("DELETE FROM images WHERE id = $1", [id]),
			});
			return errMsg;
		},
	};
}
