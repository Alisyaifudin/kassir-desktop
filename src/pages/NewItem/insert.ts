import Database from "@tauri-apps/plugin-sql";
import { tryResult } from "../../utils";

export async function insert(data: {
	name: string;
	price: string;
	stock: number;
	barcode: string | null;
}) {
	const [errDb, db] = await tryResult({
		run: () => Database.load("sqlite:mydatabase.db"),
	});
	if (errDb) {
		console.error("Gagal memuat database");
		return "Gagal memuat database";
	}
	const [errMsg] = await tryResult({
		message: "Gagal menyimpan barang",
		run: async () => {
			if (data.barcode) {
				return await db.execute(
					"INSERT INTO items (name, stock, price, barcode) VALUES ($1, $2, $3, $4)",
					[data.name, data.stock, data.price, data.barcode]
				);
			} else {
				return await db.execute(
					"INSERT INTO items (name, stock, price, barcode) VALUES ($1, $2, $3)",
					[data.name, data.stock, data.price]
				);
			}
		},
	});
	return errMsg;
}