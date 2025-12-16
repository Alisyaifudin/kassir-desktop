import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function update(
  id: number,
  name: string,
  phone: string
): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.select<DB.Customer[]>(
        "UPDATE customers SET customer_name = $1, customer_phone = $2 WHERE customer_id = $3",
        [name, phone, id]
      ),
  });
  return errMsg;
}
