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
	async getAll(): Promise<Result<"Aplikasi bermasalah", DB.Product[]>> {
		if (this.caches.all !== null) {
			return ok(this.caches.all);
		}
		const [errMsg, products] = await tryResult({
			run: () => this.db.select<DB.Product[]>("SELECT * FROM products"),
		});
		this.caches.all = products;
		if (errMsg) return err(errMsg);
		return ok(products);
	}
	async get(id: number): Promise<Result<"Aplikasi bermasalah", DB.Product | null>> {
		const [errMsg, products] = await tryResult({
			run: () => this.db.select<DB.Product[]>("SELECT * FROM products WHERE id = $1", [id]),
		});
		if (errMsg !== null) return err(errMsg);
		if (products.length === 0) return ok(null);
		return ok(products[0]);
	}
	async getHistory(
		id: number,
		offset: number,
		limit: number,
		mode: "buy" | "sell"
	): Promise<Result<"Aplikasi bermasalah", { products: ProductHistory[]; total: number }>> {
		const [errMsg, res] = await tryResult({
			run: () =>
				Promise.all([
					this.db.select<ProductHistory[]>(
						`SELECT record_items.timestamp, record_items.qty, records.mode, record_items.capital
					FROM record_items INNER JOIN records ON records.timestamp = record_items.timestamp
					WHERE record_items.product_id = $1 AND records.mode = $2
					ORDER BY record_items.timestamp DESC
					LIMIT $3
					OFFSET $4
					`,
						[id, mode, limit, offset]
					),
					this.db.select<{ count: number }[]>(
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
	}
	async getByRange(
		start: number,
		end: number
	): Promise<Result<"Aplikasi bermasalah", ProductRecord[]>> {
		return tryResult({
			run: () =>
				this.db.select<ProductRecord[]>(
					`SELECT products.id, products.name, products.price, products.capital, products.barcode, 
					 record_items.timestamp, record_items.qty, records.mode
					FROM products 
					INNER JOIN record_items ON record_items.product_id = products.id
					INNER JOIN records ON records.timestamp = record_items.timestamp
					WHERE record_items.timestamp BETWEEN $1 AND $2 ORDER BY products.name`,
					[start, end]
				),
		});
	}
	async getByBarcode(barcode: string): Promise<Result<"Aplikasi bermasalah", DB.Product | null>> {
		const [errMsg, item] = await tryResult({
			run: async () => {
				const products = await this.db.select<DB.Product[]>(
					"SELECT * FROM products WHERE barcode = ?1",
					[barcode.trim()]
				);
				return products.length ? products[0] : null;
			},
		});
		if (errMsg) return err(errMsg);
		if (item === null) return err(null);
		return ok(item);
	}
	async insert(data: {
		name: string;
		price: number;
		stock: number;
		capital: number;
		barcode: string | null;
		note?: string;
	}): Promise<"Aplikasi bermasalah" | "Barang sudah ada" | null> {
		if (data.barcode !== null) {
			const [errSelect, prod] = await tryResult({
				run: () =>
					this.db.select<any[]>("SELECT name FROM products WHERE barcode = $1", [data.barcode]),
			});
			if (errSelect) return errSelect;
			if (prod.length > 0) {
				return "Barang sudah ada";
			}
		}
		const [errMsg] = await tryResult({
			run: () =>
				this.db.execute(
					"INSERT INTO products (name, stock, price, barcode, capital, note) VALUES ($1, $2, $3, $4, $5, $6)",
					[
						data.name.trim(),
						data.stock,
						data.price,
						data.barcode === null ? null : data.barcode.trim(),
						data.capital,
						data.note ?? "",
					]
				),
		});
		return errMsg;
	}
	async insertIfNotYet(data: {
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
					return this.db.execute("UPDATE products SET stock = stock - $1 WHERE id = $2", [
						data.qty,
						data.productId,
					]);
				} else {
					return this.db.execute(
						`INSERT INTO products (name, stock, price, barcode, capital) VALUES ($1, $2, $3, $4, 0)
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
	}
	async upsert(data: {
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
					return this.db.execute(
						`UPDATE products SET name = $1, stock = stock + $2, capital = $3 WHERE id = $4`,
						[data.name.trim(), data.stock, data.capital, data.id]
					);
				} else {
					return this.db.execute(
						`INSERT INTO products (name, stock, price, barcode, capital) VALUES ($1, $2, $3, $4, $5)`,
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
	}
	async delete(id: number): Promise<"Aplikasi bermasalah" | null> {
		const [errMsg] = await tryResult({
			run: () => this.db.execute("DELETE FROM products WHERE id = $1", [id]),
		});
		if (this.caches.all) {
			this.caches.all = this.caches.all.filter((p) => p.id !== id);
		}
		return errMsg;
	}
	async update(data: {
		name: string;
		price: number;
		stock: number;
		capital: number;
		barcode: string | null;
		id: number;
		note: string;
	}): Promise<"Aplikasi bermasalah" | "Barang dengan barcode tersebut sudah ada" | null> {
		try {
			await this.db.execute(
				"UPDATE products SET name = $1, stock = $2, price = $3, barcode = $4, capital = $5, note = $6 WHERE id = $7",
				[
					data.name.trim(),
					data.stock,
					data.price,
					data.barcode === null ? null : data.barcode.trim(),
					data.capital,
					data.note,
					data.id,
				]
			);
			// update caches
			if (this.caches.all) {
				const productIndex = this.caches.all.findIndex((p) => p.id === data.id);
				this.caches.all[productIndex] = {
					id: this.caches.all[productIndex].id,
					name: data.name.trim(),
					stock: data.stock,
					price: data.price,
					barcode: data.barcode === null ? null : data.barcode.trim(),
					capital: data.capital,
					note: data.note,
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
	}
	async generateBarcode(id: number): Promise<Result<"Aplikasi bermasalah", string>> {
		const [errMsg, res] = await tryResult({
			run: () =>
				this.db.select<{ barcode: string }[]>(
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
				this.db.execute("UPDATE products SET barcode = $1 WHERE id = $2", [barcode.toString(), id]),
		});
		if (errUpdate) return err(errUpdate);
		return ok(barcode.toString());
	}
}
