import DatabaseTauri from "@tauri-apps/plugin-sql";
import { genProduct } from "./product";

export function generateDB(db: DatabaseTauri) {
  return {
    product: genProduct(db)
  }
}

export type Database = ReturnType<typeof generateDB>;