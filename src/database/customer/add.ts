import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function add(name: string, phone: string): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.select<DB.Customer[]>(
        "INSERT INTO customers (customer_name, customer_phone) VALUES ($1, $2)",
        [name, phone]
      ),
  });
  return errMsg;
}
