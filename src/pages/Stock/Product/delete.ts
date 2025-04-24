import { Database } from "../../../database";
import { tryResult } from "../../../utils";

export async function del(db: Database, id: number) {
	const [errMsg] = await tryResult({
		message: "Gagal menghapus barang",
		run: async () => db.product.delete(id),
	});
	return errMsg;
}
