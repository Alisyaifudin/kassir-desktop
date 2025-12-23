import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";
import Database from "@tauri-apps/plugin-sql";

type Data = {
  tab: number;
  id: string;
  name: string;
  value: number;
  kind: TX.ValueKind;
  saved: boolean;
};

export async function addMany(data: Data[]): Promise<DefaultError | null> {
  const tx = await getTX();
  const promises: Promise<DefaultError | null>[] = [];
  for (const d of data) {
    promises.push(add(tx, d));
  }
  const res = await Promise.all(promises);
  for (const errMsg of res) {
    if (errMsg !== null) return errMsg;
  }
  return null;
}

async function add(
  tx: Database,
  { tab, id, name, value, kind, saved }: Data
): Promise<DefaultError | null> {
  const [errMsg] = await tryResult({
    run: async () =>
      tx.execute(
        `INSERT INTO extras (extra_id, tab, extra_name, extra_value, extra_kind, extra_is_saved) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, tab, name, value, kind, saved ? 1 : 0]
      ),
  });
  return errMsg;
}
