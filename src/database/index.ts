import DatabaseTauri from "@tauri-apps/plugin-sql";
import { genProduct } from "./product";
import { genRecord } from "./record";
import { genRecordItem } from "./record-item";

export function generateDB(db: DatabaseTauri) {
  return {
    product: genProduct(db),
    record: genRecord(db),
    recordItem: genRecordItem(db)
  }
}

export type Database = ReturnType<typeof generateDB>;