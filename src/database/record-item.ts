import Database from "@tauri-apps/plugin-sql";
import { err, ok, Result, tryResult } from "../lib/utils";

export function genRecordItem(db: Database) {
	return {
		getByRange: async (start: number, end: number): Promise<Result<"Aplikasi bermasalah", DB.RecordItem[]>> => {
			return tryResult({
				run: () =>
					db.select<DB.RecordItem[]>(
						"SELECT * FROM record_items WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp DESC",
						[start, end]
					),
			});
		},
		getAllByTime: async (timestamp: number): Promise<Result<"Aplikasi bermasalah", DB.RecordItem[]>> => {
			const [errMsg, items] = await tryResult({
				run: () =>
					db.select<DB.RecordItem[]>("SELECT * FROM record_items WHERE timestamp = $1", [
						timestamp,
					]),
			});
			if (errMsg) return err(errMsg);
			return ok(items);
		},
		add: async (
			items: (Omit<DB.RecordItem, "id"> & { product_id?: number })[],
			timestamp: number,
			mode: "sell" | "buy"
		): Promise<"Aplikasi bermasalah" | null> => {
			const [errMsg] = await tryResult({
				run: () => {
					const promises = [];
					for (const item of items) {
						promises.push(
							db.execute(
								`INSERT INTO record_items 
								(timestamp, name, price, qty, total_before_disc, total, disc_val, disc_type, capital) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
								[
									timestamp,
									item.name.trim(),
									item.price,
									item.qty,
									item.total_before_disc,
									item.total,
									item.disc_val,
									item.disc_type,
									item.capital,
								]
							)
						);
						if (item.product_id !== undefined) {
							const operation = mode === "buy" ? "+" : "-";
							promises.push(
								db.execute(`UPDATE products SET stock = stock ${operation} $1 WHERE id = $2`, [
									item.qty,
									item.product_id,
								])
							);
						}
					}
					return Promise.all(promises);
				},
			});
			if (errMsg) return errMsg;
			return null;
		},
	};
}
