import Database from "@tauri-apps/plugin-sql";
import { err, ok, Result, tryResult } from "../utils";

export const genProduct = (db: Database) => ({
	getAll: (): Promise<Result<string, DB.Product[]>> =>
		tryResult({ run: () => db.select<DB.Product[]>("SELECT * FROM products") }),
	get: async (id: number): Promise<Result<string, DB.Product | null>> => {
		const [errMsg, products] = await tryResult({
			run: () => db.select<DB.Product[]>("SELECT * FROM products WHERE id = $1", [id]),
		});
		if (errMsg !== null) return err(errMsg);
		if (products.length === 0) return ok(null);
		return ok(products[0]);
	},
	getByBarcode: async (barcode: number): Promise<Result<string, DB.Product>> => {
		const [errMsg, item] = await tryResult({
			run: async () => {
				const products = await db.select<DB.Product[]>("SELECT * FROM products WHERE barcode = ?1", [
					barcode,
				]);
				return products.length ? products[0] : null;
			},
		});
		if (errMsg) return err(errMsg);
		if (item === null) return err("Barang tidak ada");
		return ok(item);
	},
	search: async (name: string): Promise<Result<string, DB.Product[]>> => {
		return tryResult({
			run: async () =>
				db.select<DB.Product[]>(
					"SELECT * FROM products WHERE LOWER(name) LIKE '%' || LOWER(?1) || '%' AND stock > 0 LIMIT 20",
					[name.trim()]
				),
		});
	},
	insert: async (data: {
		name: string;
		price: number;
		stock: number;
		barcode: number | null;
	}): Promise<string | null> => {
		const [errMsg] = await tryResult({
			run: () =>
				db.execute("INSERT INTO products (name, stock, price, barcode) VALUES ($1, $2, $3, $4)", [
					data.name,
					data.stock,
					data.price,
					data.barcode,
				]),
		});
		return errMsg;
	},
	delete: async (id: number): Promise<string | null> => {
		const [errMsg] = await tryResult({
			run: () => db.execute("DELETE FROM products WHERE id = $1", [id]),
		});
		return errMsg;
	},
	update: async (data: {
		name: string;
		price: number;
		stock: number;
		barcode: number | null;
		id: number;
	}): Promise<string | null> => {
		const [errMsg] = await tryResult({
			run: () =>
				db.execute(
					"UPDATE products SET name = $1, stock = $2, price = $3, barcode = $4 WHERE id = $5",
					[data.name, data.stock, data.price, data.barcode, data.id]
				),
		});
		return errMsg;
	},
});
