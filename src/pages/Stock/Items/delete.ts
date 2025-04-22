import Database from "@tauri-apps/plugin-sql";
import { tryResult } from "../../../utils";

export async function del(id: number) {
	const [errDb, db] = await tryResult({
		run: () => Database.load("sqlite:mydatabase.db"),
	});
	if (errDb) {
		console.error("Gagal memuat database");
		return "Gagal memuat database";
	}
	const [errMsg] = await tryResult({
		message: "Gagal menghapus barang",
		run: async () => db.execute("DELETE FROM items WHERE id = $1", [id]),
	});
	return errMsg;
}
