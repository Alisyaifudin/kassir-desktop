import Database from "@tauri-apps/plugin-sql";

let db: undefined | Database = undefined;

const DB_PATH = "sqlite:data.db";

export async function getDB() {
  if (db !== undefined) return db;
  db = await Database.load(DB_PATH);
  return db;
}
