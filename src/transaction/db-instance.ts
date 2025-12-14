import Database from "@tauri-apps/plugin-sql";

let tx: Database | undefined = undefined;

export const TX_PATH = "sqlite:tx.db";

export async function getTX(): Promise<Database> {
  if (tx !== undefined) return tx;
  tx = await Database.load(TX_PATH);
  return tx;
}
