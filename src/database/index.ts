import DatabaseTauri from "@tauri-apps/plugin-sql";
import { genProduct } from "./product";
import { genRecord } from "./record";
import { genRecordItem } from "./record-item";
import { genAdditional } from "./additional";
import { genChasier } from "./cashier";
import { genDiscount } from "./discount";

export function generateDB(db: DatabaseTauri) {
	return {
		product: genProduct(db),
		record: genRecord(db),
		recordItem: genRecordItem(db),
		additional: genAdditional(db),
		cashier: genChasier(db),
		discount: genDiscount(db),
		exec: db.execute,
	};
}

export type Database = ReturnType<typeof generateDB>;
