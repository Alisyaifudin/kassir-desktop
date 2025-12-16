import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function del(name: string): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () => db.execute("DELETE FROM cashiers WHERE cashier_name = $1", [name]),
  });
  return errMsg;
}
