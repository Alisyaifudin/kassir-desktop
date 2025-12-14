import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function price(id: string, price: number): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () =>
      tx.execute("UPDATE products SET product_price = $1 WHERE product_id = $2", [price, id]),
  });
  if (errMsg) return errMsg;
  return null;
}
