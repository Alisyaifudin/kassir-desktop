import DatabaseTauri from "@tauri-apps/plugin-sql";
import { genProduct } from "./product";
import { genRecord } from "./record";
import { genRecordItem } from "./record-item";
import { genTax } from "./tax";
import { genChasier } from "./cashier";

export function generateDB(db: DatabaseTauri) {
	return {
		product: genProduct(db),
		record: genRecord(db),
		recordItem: genRecordItem(db),
		tax: genTax(db),
		cashier: genChasier(db),
	};
}

export type Database = ReturnType<typeof generateDB>;
