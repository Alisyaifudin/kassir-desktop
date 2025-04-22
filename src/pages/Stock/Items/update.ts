import Database from "@tauri-apps/plugin-sql";
import { tryResult } from "../../../utils";

export async function update(data: {
	name: string;
	price: string;
	stock: number;
	barcode: string | null;
	id: number;
}) {
	const [errDb, db] = await tryResult({
		run: () => Database.load("sqlite:mydatabase.db"),
	});
	if (errDb) {
		console.error("Gagal memuat database");
		return "Gagal memuat database";
	}
	const [errMsg] = await tryResult({
		message: "Gagal mengedit barang",
		run: async () =>
			db.execute("UPDATE items SET name = $1, stock = $2, price = $3, barcode = $4 WHERE id = $5", [
				data.name,
				data.stock,
				data.price,
				data.barcode === "" ? null : data.barcode,
				data.id,
			]),
	});
	return errMsg;
}
