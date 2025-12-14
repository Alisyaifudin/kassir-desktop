import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function delById(id: string): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () => tx.execute("DELETE FROM products WHERE product_id = $1", [id]),
  });
  if (errMsg) return errMsg;
  return null;
}
