import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function qty(id: string, qty: number): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () => tx.execute("UPDATE products SET product_qty = $1 WHERE product_id = $2", [qty, id]),
  });
  if (errMsg) return errMsg;
  return null;
}
