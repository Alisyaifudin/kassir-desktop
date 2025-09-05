import Database from "@tauri-apps/plugin-sql";
import { err, ok, Result, tryResult } from "../lib/utils";

export type AdditionalRecord = DB.AdditionalItem & Pick<DB.Additional, "timestamp">;

// export type ProductHistory = Pick<DB.RecordItem, "qty" | "timestamp" | "capital"> &
// 	Pick<DB.Record, "mode">;

export class AdditionalItemTable {
	db: Database;
	constructor(db: Database) {
		this.db = db;
	}
	caches = {
		all: null as DB.AdditionalItem[] | null,
	};
	revalidate(key: "all") {
		this.caches[key] = null;
	}
	get get() {
		return get(this);
	}
	get add() {
		return add(this);
	}
	get update() {
		return update(this);
	}
	get del() {
		const self = this;
		return {
			async byId(id: number): Promise<"Aplikasi bermasalah" | null> {
				const [errMsg] = await tryResult({
					run: () => self.db.execute("DELETE FROM additional_items WHERE id = $1", [id]),
				});
				if (self.caches.all) {
					self.caches.all = self.caches.all.filter((p) => p.id !== id);
				}
				return errMsg;
			},
		};
	}
}

function get(self: AdditionalItemTable) {
	return {
		async all(): Promise<Result<"Aplikasi bermasalah", DB.AdditionalItem[]>> {
			if (self.caches.all !== null) {
				return ok(self.caches.all);
			}
			const [errMsg, products] = await tryResult({
				run: () => self.db.select<DB.AdditionalItem[]>("SELECT * FROM additional_items"),
			});
			self.caches.all = products;
			if (errMsg) return err(errMsg);
			return ok(products);
		},
		async byId(id: number): Promise<Result<"Aplikasi bermasalah", DB.AdditionalItem | null>> {
			const [errMsg, products] = await tryResult({
				run: () =>
					self.db.select<DB.AdditionalItem[]>("SELECT * FROM additional_items WHERE id = $1", [id]),
			});
			if (errMsg !== null) return err(errMsg);
			if (products.length === 0) return ok(null);
			return ok(products[0]);
		},
		// async history(
		// 	id: number,
		// 	offset: number,
		// 	limit: number,
		// ): Promise<Result<"Aplikasi bermasalah", { products: ProductHistory[]; total: number }>> {
		// 	const [errMsg, res] = await tryResult({
		// 		run: () =>
		// 			Promise.all([
		// 				self.db.select<ProductHistory[]>(
		// 					`SELECT record_items.timestamp, record_items.qty, records.mode, record_items.capital
		// 			FROM record_items INNER JOIN records ON records.timestamp = record_items.timestamp
		// 			WHERE record_items.product_id = $1 AND records.mode = $2
		// 			ORDER BY record_items.timestamp DESC
		// 			LIMIT $3
		// 			OFFSET $4
		// 			`,
		// 					[id, mode, limit, offset]
		// 				),
		// 				self.db.select<{ count: number }[]>(
		// 					`SELECT COUNT(*) as count
		// 				 FROM record_items INNER JOIN records ON records.timestamp = record_items.timestamp
		// 				 WHERE record_items.product_id = $1 AND records.mode = $2`,
		// 					[id, mode]
		// 				),
		// 			]),
		// 	});
		// 	if (errMsg !== null) return err(errMsg);
		// 	const products = res[0];
		// 	const total = res[1][0].count;
		// 	return ok({ products, total });
		// },
		async byRange(
			start: number,
			end: number
		): Promise<Result<"Aplikasi bermasalah", AdditionalRecord[]>> {
			return tryResult({
				run: () =>
					self.db.select<AdditionalRecord[]>(
						`SELECT additional_items.id, additional_items.name, 
						 additional_items.value, additional_items.kind, additionals.timestamp
						 FROM additional_items
						 INNER JOIN additionals ON additionals.item_id = additional_items.id
						 WHERE additionals.timestamp BETWEEN $1 AND $2 ORDER BY additional_items.name`,
						[start, end]
					),
			});
		},
	};
}

function add(self: AdditionalItemTable) {
	return {
		async one(data: {
			name: string;
			value: number;
			kind: DB.ValueKind;
		}): Promise<Result<"Aplikasi bermasalah", number | null>> {
			const [errFind, find] = await tryResult({
				run: () =>
					self.db.select<{ id: number }[]>("SELECT id FROM additional_items WHERE name = ?", [
						data.name,
					]),
			});
			if (errFind) return err(errFind);
			if (find.length > 0) {
				const id = find[0].id;
				const [errMsg] = await tryResult({
					run: () =>
						self.db.execute(`UPDATE additional_items SET value = ?1, kind = ?2 WHERE id = ?3`, [
							data.value,
							data.kind,
							id,
						]),
				});
				if (errMsg !== null) {
					return err(errMsg);
				}
				// update caches
				self.caches.all = null;
				return ok(id);
			} else {
				const [errMsg, res] = await tryResult({
					run: () =>
						self.db.execute(
							`INSERT INTO additional_items (name, value, kind) VALUES ($1, $2, $3) 
						 ON CONFLICT(name) DO NOTHING`,
							[data.name.trim(), data.value, data.kind]
						),
				});
				if (errMsg !== null) {
					return err(errMsg);
				}
				const id = res.lastInsertId ?? null;
				// update caches
				self.caches.all = null;
				return ok(id);
			}
		},
	};
}

function update(self: AdditionalItemTable) {
	return {
		async one(data: {
			id: number;
			name: string;
			value: number;
			kind: DB.ValueKind;
		}): Promise<"Aplikasi bermasalah" | null> {
			const [errMsg] = await tryResult({
				run: () =>
					self.db.execute(
						`UPDATE additional_items SET name = $1, value = $2, kind = $3 WHERE id = $4`,
						[data.name.trim(), data.value, data.kind, data.id]
					),
			});
			// update caches
			if (self.caches.all !== null) {
				const productIndex = self.caches.all.findIndex((p) => p.id === data.id);
				self.caches.all[productIndex] = {
					id: self.caches.all[productIndex].id,
					name: data.name.trim(),
					value: data.value,
					kind: data.kind,
				};
			}
			return errMsg;
		},
	};
}
