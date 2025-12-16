import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function updateHash(name: string, hash: string): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute("UPDATE cashiers SET cashier_hash = $1 WHERE cashier_name = $2", [hash, name]),
  });
  return errMsg;
}
