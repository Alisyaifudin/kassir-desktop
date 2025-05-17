import DatabaseTauri from "@tauri-apps/plugin-sql";
import { ProductTable } from "./product";
import { genRecord } from "./record";
import { genRecordItem } from "./record-item";
import { genAdditional } from "./additional";
import { genChasier } from "./cashier";
import { genDiscount } from "./discount";
import { genImage } from "./image";
import { genSocial } from "./social";
import { genMoney } from "./money";
import { genMethod } from "./method";

export function generateDB(db: DatabaseTauri) {
	return {
		product: new ProductTable(db),
		record: genRecord(db),
		recordItem: genRecordItem(db),
		additional: genAdditional(db),
		cashier: genChasier(db),
		discount: genDiscount(db),
		image: genImage(db),
		social: genSocial(db),
		money: genMoney(db),
		method: genMethod(db),
		exec: db.execute,
	};
}

export type Database = ReturnType<typeof generateDB>;
