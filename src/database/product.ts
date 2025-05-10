import Database from "@tauri-apps/plugin-sql";
import { err, log, ok, Result, tryResult } from "../lib/utils";

export type ProductRecord = Pick<DB.Product, "id" | "name" | "price" | "capital" | "barcode"> &
	Pick<DB.RecordItem, "timestamp" | "qty"> &
	Pick<DB.Record, "mode">;

export type ProductHistory = { timestamp: number; qty: number; mode: "sell" | "buy" };

export const genProduct = (db: Database) => ({
	getAll: (): Promise<Result<"Aplikasi bermasalah", DB.Product[]>> =>
		tryResult({ run: () => db.select<DB.Product[]>("SELECT * FROM products") }),
	get: async (id: number): Promise<Result<"Aplikasi bermasalah", DB.Product | null>> => {
		const [errMsg, products] = await tryResult({
			run: () => db.select<DB.Product[]>("SELECT * FROM products WHERE id = $1", [id]),
		});
		if (errMsg !== null) return err(errMsg);
		if (products.length === 0) return ok(null);
		return ok(products[0]);
	},
	getHistory: async (
		id: number,
		start: number,
		end: number
	): Promise<Result<"Aplikasi bermasalah", ProductHistory[] >> => {
		const [errMsg, products] = await tryResult({
			run: () =>
				db.select<ProductHistory[]>(
					`SELECT record_items.timestamp, record_items.qty, records.mode
					FROM record_items INNER JOIN records ON records.timestamp = record_items.timestamp
					WHERE record_items.product_id = $1 AND record_items.timestamp BETWEEN $2 AND $3
					ORDER BY record_items.timestamp DESC`,
					[id, start, end]
				),
		});
		if (errMsg !== null) return err(errMsg);
		return ok(products);
	},
	getByRange: async (
		start: number,
		end: number
	): Promise<Result<"Aplikasi bermasalah", ProductRecord[]>> =>
		tryResult({
			run: () =>
				db.select<ProductRecord[]>(
					`SELECT products.id, products.name, products.price, products.capital, products.barcode, 
					 record_items.timestamp, record_items.qty, records.mode
			 FROM products 
			 INNER JOIN record_items ON record_items.product_id = products.id
			 INNER JOIN records ON records.timestamp = record_items.timestamp
			 WHERE record_items.timestamp BETWEEN $1 AND $2 ORDER BY products.name`,
					[start, end]
				),
		}),
	getByBarcode: async (
		barcode: string
	): Promise<Result<"Aplikasi bermasalah", DB.Product | null>> => {
		const [errMsg, item] = await tryResult({
			run: async () => {
				const products = await db.select<DB.Product[]>(
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
	searchByName: async (name: string): Promise<Result<"Aplikasi Bermasalah", DB.Product[]>> => {
		return tryResult({
			run: async () =>
				db.select<DB.Product[]>(
					"SELECT * FROM products WHERE LOWER(name) LIKE '%' || LOWER(?1) || '%' ORDER BY name LIMIT 20",
					[name.trim()]
				),
		});
	},
	searchByBarcode: async (
		barcode: string
	): Promise<Result<"Aplikasi Bermasalah", DB.Product[]>> => {
		return tryResult({
			run: async () =>
				db.select<DB.Product[]>(
					"SELECT * FROM products WHERE barcode LIKE $1 || '%' ORDER BY barcode LIMIT 20",
					[barcode.trim()]
				),
		});
	},
	insert: async (data: {
		name: string;
		price: number;
		stock: number;
		capital: number;
		barcode: string | null;
		note?: string;
	}): Promise<"Aplikasi bermasalah" | "Barang sudah ada" | null> => {
		if (data.barcode !== null) {
			const [errSelect, prod] = await tryResult({
				run: () => db.select<any[]>("SELECT name FROM products WHERE barcode = $1", [data.barcode]),
			});
			if (errSelect) return errSelect;
			if (prod.length > 0) {
				return "Barang sudah ada";
			}
		}
		const [errMsg] = await tryResult({
			run: () =>
				db.execute(
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
	},
	insertIfNotYet: async (data: {
		name: string;
		price: number;
		stock: number;
		barcode: string | null;
	}): Promise<
		Result<
			"Aplikasi bermasalah" | `Ada barang dengan barcode yang sama: ${string}` | null,
			number | null
		>
	> => {
		const [errMsg, res] = await tryResult({
			run: () =>
				db.execute(
					`INSERT INTO products (name, stock, price, barcode, capital) VALUES ($1, $2, $3, $4, 0)
					 ON CONFLICT(barcode) DO NOTHING`,
					[
						data.name.trim(),
						data.stock,
						data.price,
						data.barcode === null ? null : data.barcode.trim(),
					]
				),
		});
		if (errMsg) return err(errMsg);
		const id = res.lastInsertId;
		if (id === undefined) {
			if (data.barcode !== null) {
				return ok(null);
			}
			log.error("Failed to insert new product: insertIfNotYet");
			return err("Aplikasi bermasalah");
		}
		return ok(id);
	},
	upsert: async (data: {
		name: string;
		price: number;
		stock: number;
		capital: number;
		barcode: string | null;
		id: number | null;
	}): Promise<Result<"Aplikasi bermasalah" | null, number | null>> => {
		const [errMsg, res] = await tryResult({
			run: async () => {
				if (data.id) {
					return db.execute(
						`UPDATE products SET name = $1, stock = stock + $2, capital = $3 WHERE id = $4`,
						[data.name.trim(), data.stock, data.capital, data.id]
					);
				} else {
					return db.execute(
						`INSERT INTO products (name, stock, price, barcode, capital) VALUES ($1, $2, $3, $4, $5)`,
						//  ON CONFLICT(barcode) DO UPDATE SET name = $1, stock = stock + $2, capital = $5
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
	delete: async (id: number): Promise<"Aplikasi bermasalah" | null> => {
		const [errMsg] = await tryResult({
			run: () => db.execute("DELETE FROM products WHERE id = $1", [id]),
		});
		return errMsg;
	},
	update: async (data: {
		name: string;
		price: number;
		stock: number;
		capital: number;
		barcode: string | null;
		id: number;
	}): Promise<"Aplikasi bermasalah" | null> => {
		const [errMsg] = await tryResult({
			run: () =>
				db.execute(
					"UPDATE products SET name = $1, stock = $2, price = $3, barcode = $4, capital = $5 WHERE id = $6",
					[
						data.name.trim(),
						data.stock,
						data.price,
						data.barcode === null ? null : data.barcode.trim(),
						data.capital,
						data.id,
					]
				),
		});
		return errMsg;
	},
});
