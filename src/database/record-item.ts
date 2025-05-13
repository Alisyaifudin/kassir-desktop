import Database from "@tauri-apps/plugin-sql";
import { err, ok, Result, tryResult } from "../lib/utils";

export function genRecordItem(db: Database) {
	return {
		getByRange: async (
			start: number,
			end: number
		): Promise<Result<"Aplikasi bermasalah", DB.RecordItem[]>> => {
			return tryResult({
				run: () =>
					db.select<DB.RecordItem[]>(
						"SELECT * FROM record_items WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp DESC",
						[start, end]
					),
			});
		},
		getAllByTime: async (
			timestamp: number
		): Promise<Result<"Aplikasi bermasalah", DB.RecordItem[]>> => {
			const [errMsg, items] = await tryResult({
				run: () =>
					db.select<DB.RecordItem[]>("SELECT * FROM record_items WHERE timestamp = $1", [
						timestamp,
					]),
			});
			if (errMsg) return err(errMsg);
			return ok(items);
		},
		updateProductId: async (
			itemId: number,
			productId: number | null
		): Promise<"Aplikasi bermasalah" | null> => {
			const [errMsg] = await tryResult({
				run: () =>
					db.execute("UPDATE record_items SET product_id = $1 WHERE id = $2", [productId, itemId]),
			})
			return errMsg;
		},
		add: async (
			item: Omit<DB.RecordItem, "id"> & { product_id: number | null },
			timestamp: number,
			mode: "sell" | "buy"
		): Promise<Result<"Aplikasi bermasalah" | "Gagal menyimpan. Coba lagi." | null, number>> => {
			const [errMsg, res] = await tryResult({
				run: async () => {
					const promise = [
						db.execute(
							`INSERT INTO record_items 
								(timestamp, name, price, qty, total_before_disc, total, capital, product_id) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
							[
								timestamp,
								item.name.trim(),
								item.price,
								item.qty,
								item.total_before_disc,
								item.total,
								item.capital,
								item.product_id,
							]
						),
					];
					if (item.product_id !== undefined && mode === "sell") {
						promise.push(
							db.execute(`UPDATE products SET stock = stock - $1 WHERE id = $2`, [
								item.qty,
								item.product_id,
							])
						);
					}
					return Promise.all(promise);
				},
			});

			if (errMsg) return err(errMsg);
			const id = res[0].lastInsertId;
			if (id === undefined) return err("Gagal menyimpan. Coba lagi.");
			return ok(id);
		},
	};
}
