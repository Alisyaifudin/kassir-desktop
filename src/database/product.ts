import Database from "@tauri-apps/plugin-sql";
import { err, ok, Result, tryResult } from "../lib/utils";

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
	}): Promise<"Aplikasi bermasalah" | null> => {
		const [errMsg] = await tryResult({
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
		return errMsg;
	},
	upsert: async (data: {
		name: string;
		price: number;
		stock: number;
		capital: number;
		barcode: string | null;
	}): Promise<"Aplikasi bermasalah" | null> => {
		const [errMsg] = await tryResult({
			run: () =>
				db.execute(
					`INSERT INTO products (name, stock, price, barcode, capital) VALUES ($1, $2, $3, $4, $5)
					 ON CONFLICT(barcode) DO UPDATE SET name = $1, stock = stock + $2, capital = $5`,
					[
						data.name.trim(),
						data.stock,
						data.price,
						data.barcode === null ? null : data.barcode.trim(),
						data.capital,
					]
				),
		});
		console.log("ada error", errMsg);
		return errMsg;
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
