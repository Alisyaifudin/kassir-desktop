import { Database } from "../../../database";
import { tryResult } from "../../../utils";

export async function insert(
	db: Database,
	data: {
		name: string;
		price: number;
		stock: number;
		barcode: number | null;
	}
) {
	const [errMsg] = await tryResult({
		message: "Gagal menyimpan barang",
		run: () => db.product.insert(data),
	});
	return errMsg;
}

// {
// 	if (data.barcode) {
// 		return await db.execute(
// 			"INSERT INTO items (name, stock, price, barcode) VALUES ($1, $2, $3, $4)",
// 			[data.name, data.stock, data.price, data.barcode]
// 		);
// 	} else {
// 		return await db.execute("INSERT INTO items (name, stock, price) VALUES ($1, $2, $3)", [
// 			data.name,
// 			data.stock,
// 			data.price,
// 		]);
// 	}
// },
