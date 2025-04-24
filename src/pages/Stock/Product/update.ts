import { Database } from "../../../database";
import { tryResult } from "../../../utils";

export async function update(
	db: Database,
	data: {
		name: string;
		price: number;
		stock: number;
		barcode: number | null;
		id: number;
	}
) {
	const [errMsg] = await tryResult({
		message: "Gagal mengedit barang",
		run: () => db.product.update(data),
	});
	return errMsg;
}
