import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function delById(id: number): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () => db.select<DB.Customer[]>("DELETE FROM customers WHERE customer_id = $1", [id]),
  });
  return errMsg;
}
