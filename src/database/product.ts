import Database from "@tauri-apps/plugin-sql";

export const genProduct = (db: Database) => ({
	getAll: () => db.select<DB.Product[]>("SELECT * FROM products"),
	get: async (id: number): Promise<DB.Product | null> => {
		const products = await db.select<DB.Product[]>("SELECT * FROM items WHERE id = $1", [id]);
		if (products.length === 0) return null;
		return products[0];
	},
	insert: (data: { name: string; price: number; stock: number; barcode: number | null }) =>
		db.execute("INSERT INTO products (name, stock, price, barcode) VALUES ($1, $2, $3, $4)", [
			data.name,
			data.stock,
			data.price,
			data.barcode,
		]),
	delete: (id: number) => db.execute("DELETE FROM products WHERE id = $1", [id]),
	update: (data: {
		name: string;
		price: number;
		stock: number;
		barcode: number | null;
		id: number;
	}) =>
		db.execute("UPDATE items SET name = $1, stock = $2, price = $3, barcode = $4 WHERE id = $5", [
			data.name,
			data.stock,
			data.price,
			data.barcode,
			data.id,
		]),
});
