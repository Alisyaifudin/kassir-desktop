import Database from "@tauri-apps/plugin-sql";
import { err, log, ok, Result, tryResult } from "../lib/utils";
import { findNextBarcode, genBarcode } from "~/lib/barcode";

export type ProductRecord = Pick<DB.Product, "id" | "name" | "price" | "capital" | "barcode"> &
	Pick<DB.RecordItem, "timestamp" | "qty"> &
	Pick<DB.Record, "mode">;

export type ProductHistory = Pick<DB.RecordItem, "qty" | "timestamp" | "capital"> &
	Pick<DB.Record, "mode">;

export class ProductTable {
	db: Database;
	constructor(db: Database) {
		this.db = db;
	}
	caches = {
		all: null as DB.Product[] | null,
	};
	revalidate(key: "all") {
		this.caches[key] = null;
	}
	get aux() {
		return aux(this);
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
			async byId(id: number): Promise<Result<"Aplikasi bermasalah", string[]>> {
				const [errImg, images] = await tryResult({
					run: () =>
						self.db.select<{ name: string }[]>("SELECT name FROM images WHERE product_id = $1", [
							id,
						]),
				});
				if (errImg) return err(errImg);
				const [errMsg] = await tryResult({
					run: () => self.db.execute("DELETE FROM products WHERE id = $1", [id]),
				});
				if (self.caches.all) {
					self.caches.all = self.caches.all.filter((p) => p.id !== id);
				}
				if (errMsg) return err(errMsg);
				return ok(images.map((m) => m.name));
			},
		};
	}
}

function get(self: ProductTable) {
	return {
		async all(): Promise<Result<"Aplikasi bermasalah", DB.Product[]>> {
			if (self.caches.all !== null) {
				return ok(self.caches.all);
			}
			const [errMsg, products] = await tryResult({
				run: () => self.db.select<DB.Product[]>("SELECT * FROM products"),
			});
			self.caches.all = products;
			if (errMsg) return err(errMsg);
			return ok(products);
		},
		async byId(id: number): Promise<Result<"Aplikasi bermasalah", DB.Product | null>> {
			const [errMsg, products] = await tryResult({
				run: () => self.db.select<DB.Product[]>("SELECT * FROM products WHERE id = $1", [id]),
			});
			if (errMsg !== null) return err(errMsg);
			if (products.length === 0) return ok(null);
			return ok(products[0]);
		},
		async history(
			id: number,
			offset: number,
			limit: number,
			mode: "buy" | "sell"
		): Promise<Result<"Aplikasi bermasalah", { products: ProductHistory[]; total: number }>> {
			const [errMsg, res] = await tryResult({
				run: () =>
					Promise.all([
						self.db.select<ProductHistory[]>(
							`SELECT record_items.timestamp, record_items.qty, records.mode, record_items.capital
					FROM record_items INNER JOIN records ON records.timestamp = record_items.timestamp
					WHERE record_items.product_id = $1 AND records.mode = $2
					ORDER BY record_items.timestamp DESC
					LIMIT $3
					OFFSET $4
					`,
							[id, mode, limit, offset]
						),
						self.db.select<{ count: number }[]>(
							`SELECT COUNT(*) as count
						 FROM record_items INNER JOIN records ON records.timestamp = record_items.timestamp
						 WHERE record_items.product_id = $1 AND records.mode = $2`,
							[id, mode]
						),
					]),
			});
			if (errMsg !== null) return err(errMsg);
			const products = res[0];
			const total = res[1][0].count;
			return ok({ products, total });
		},
		async byRange(
			start: number,
			end: number
		): Promise<Result<"Aplikasi bermasalah", ProductRecord[]>> {
			return tryResult({
				run: () =>
					self.db.select<ProductRecord[]>(
						`SELECT products.id, products.name, products.price, products.capital, products.barcode, 
					 record_items.timestamp, record_items.qty, records.mode
					FROM products 
					INNER JOIN record_items ON record_items.product_id = products.id
					INNER JOIN records ON records.timestamp = record_items.timestamp
					WHERE record_items.timestamp BETWEEN $1 AND $2 ORDER BY products.name`,
						[start, end]
					),
			});
		},
		async byBarcode(barcode: string): Promise<Result<"Aplikasi bermasalah", DB.Product | null>> {
			const [errMsg, item] = await tryResult({
				run: async () => {
					const products = await self.db.select<DB.Product[]>(
						"SELECT * FROM products WHERE barcode = ?1",
						[barcode.trim()]
					);
					return products.length ? products[0] : null;
				},
			});
			if (errMsg) return err(errMsg);
			if (item === null) return err(null);
			return ok(item);
		},
	};
}

function add(self: ProductTable) {
	return {
		async one(data: {
			name: string;
			price: number;
			stock: number;
			stockBack: number;
			capital: number;
			barcode: string | null;
			note?: string;
		}): Promise<"Aplikasi bermasalah" | "Barang sudah ada" | null> {
			if (data.barcode !== null) {
				const [errSelect, prod] = await tryResult({
					run: () =>
						self.db.select<any[]>("SELECT name FROM products WHERE barcode = $1", [data.barcode]),
				});
				if (errSelect) return errSelect;
				if (prod.length > 0) {
					return "Barang sudah ada";
				}
			}
			const [errMsg] = await tryResult({
				run: () =>
					self.db.execute(
						"INSERT INTO products (name, stock, price, barcode, capital, note, stock_back) VALUES ($1, $2, $3, $4, $5, $6, $7)",
						[
							data.name.trim(),
							data.stock,
							data.price,
							data.barcode === null ? null : data.barcode.trim(),
							data.capital,
							data.note ?? "",
							data.stockBack,
						]
					),
			});
			return errMsg;
		},
		async ifNotYet(data: {
			name: string;
			price: number;
			stock: number;
			qty: number;
			barcode: string | null;
			productId: number | null;
		}): Promise<
			Result<
				"Aplikasi bermasalah" | `Ada barang dengan barcode yang sama: ${string}` | null,
				number | null
			>
		> {
			const [errMsg, res] = await tryResult({
				run: () => {
					if (data.productId) {
						return self.db.execute("UPDATE products SET stock = stock - $1 WHERE id = $2", [
							data.qty,
							data.productId,
						]);
					} else {
						return self.db.execute(
							`INSERT INTO products (name, stock, price, barcode, capital, stock_back) VALUES ($1, $2, $3, $4, 0, 0)
					 ON CONFLICT(barcode) DO NOTHING`,
							[
								data.name.trim(),
								data.stock,
								data.price,
								data.barcode === null ? null : data.barcode.trim(),
							]
						);
					}
				},
			});
			if (errMsg) return err(errMsg);
			const id = data.productId ?? res.lastInsertId;
			if (id === undefined) {
				if (data.barcode !== null) {
					return ok(null);
				}
				log.error("Failed to insert new product: insertIfNotYet");
				return err("Aplikasi bermasalah");
			}
			return ok(id);
		},
		async orUpdate(data: {
			name: string;
			price: number;
			stock: number;
			capital: number;
			barcode: string | null;
			id: number | null;
		}): Promise<Result<"Aplikasi bermasalah" | null, number | null>> {
			const [errMsg, res] = await tryResult({
				run: async () => {
					if (data.id) {
						return self.db.execute(
							`UPDATE products SET name = $1, stock = stock + $2, capital = $3 WHERE id = $4`,
							[data.name.trim(), data.stock, data.capital, data.id]
						);
					} else {
						return self.db.execute(
							`INSERT INTO products (name, stock, price, barcode, capital, stock_back) VALUES ($1, $2, $3, $4, $5, 0)`,
							[
								data.name.trim(),
								data.stock,
								data.price,
								data.barcode === null ? null : data.barcode.trim(),
								data.capital,
							]
						);
					}
				},
			});
			if (errMsg) return err(errMsg);
			if (data.id) {
				return ok(null);
			}
			const id = res.lastInsertId;
			if (id === undefined) {
				log.error("Failed to insert new product: insertIfNotYet");
				return err("Aplikasi bermasalah");
			}
			return ok(id);
		},
		// async upsertServer(data: {
		// 	id: number;
		// 	name: string;
		// 	price: number;
		// 	stock: number;
		// 	capital: number;
		// 	barcode: string | null;
		// 	note: string;
		// }): Promise<"Aplikasi bermasalah" | null> {
		// 	const [errMsg] = await tryResult({
		// 		run: async () => {
		// 			return this.db.execute(
		// 				`INSERT INTO products (id, name, price, stock, barcode, capital, note)
		// 			 VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT(id) DO UPDATE SET
		// 			 name = $2, price = $3, stock = $4, barcode = $5, capital = $6, note = $7`,
		// 				[
		// 					data.id,
		// 					data.name.trim(),
		// 					data.price,
		// 					data.stock,
		// 					data.barcode === null ? null : data.barcode.trim(),
		// 					data.capital,
		// 					data.note,
		// 				]
		// 			);
		// 		},
		// 	});
		// 	if (errMsg) return errMsg;
		// 	this.revalidate("all");
		// 	return null;
		// },
	};
}

function update(self: ProductTable) {
	return {
		async one(data: {
			name: string;
			price: number;
			stock: number;
			stockBack: number;
			capital: number;
			barcode: string | null;
			id: number;
			note: string;
			updatedAt: number;
		}): Promise<"Aplikasi bermasalah" | "Barang dengan barcode tersebut sudah ada" | null> {
			try {
				await self.db.execute(
					`UPDATE products SET name = $1, stock = $2, stock_back = $3, price = $4, 
					 barcode = $5, capital = $6, note = $7 WHERE id = $8`,
					[
						data.name.trim(),
						data.stock,
						data.stockBack,
						data.price,
						data.barcode === null ? null : data.barcode.trim(),
						data.capital,
						data.note,
						data.id,
					]
				);
				// update caches
				if (self.caches.all) {
					const productIndex = self.caches.all.findIndex((p) => p.id === data.id);
					self.caches.all[productIndex] = {
						id: self.caches.all[productIndex].id,
						name: data.name.trim(),
						stock: data.stock,
						stock_back: data.stockBack,
						price: data.price,
						barcode: data.barcode === null ? null : data.barcode.trim(),
						capital: data.capital,
						note: data.note,
						updated_at: data.updatedAt,
					};
				}
				return null;
			} catch (error) {
				if (typeof error === "string") {
					if (error.includes("UNIQUE constraint failed: products.barcode")) {
						return "Barang dengan barcode tersebut sudah ada";
					}
				}
				return "Aplikasi bermasalah";
			}
		},
	};
}

function aux(self: ProductTable) {
	return {
		async checkBarcodes(barcodes: string[]): Promise<Result<"Aplikasi bermasalah", boolean>> {
			const promises: Promise<DB.Product[]>[] = [];
			for (const barcode of barcodes) {
				promises.push(
					self.db.select<DB.Product[]>("SELECT * FROM products WHERE barcode = ?", [barcode])
				);
			}
			const [errMsg, items] = await tryResult({
				run: () => Promise.all(promises),
			});
			if (errMsg) return err(errMsg);
			for (const item of items) {
				if (item.length > 0) {
					return ok(true);
				}
			}
			return ok(false);
		},
		async generateBarcode(id: number): Promise<Result<"Aplikasi bermasalah", string>> {
			const [errMsg, res] = await tryResult({
				run: () =>
					self.db.select<{ barcode: string }[]>(
						`SELECT barcode FROM products WHERE barcode LIKE '2123456%'
					 ORDER BY barcode ASC`
					),
			});
			if (errMsg) return err(errMsg);
			let num = 0;
			if (res.length > 0) {
				num = findNextBarcode(res.map((r) => Number(r.barcode.slice(7, -1))));
			}

			const barcode = genBarcode(num);
			const [errUpdate] = await tryResult({
				run: () =>
					self.db.execute("UPDATE products SET barcode = $1 WHERE id = $2", [
						barcode.toString(),
						id,
					]),
			});
			if (errUpdate) return err(errUpdate);
			return ok(barcode.toString());
		},
	};
}
