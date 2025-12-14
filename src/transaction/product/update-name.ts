import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function name(id: string, name: string): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () =>
      tx.execute("UPDATE products SET product_name = $1 WHERE product_id = $2", [name, id]),
  });
  if (errMsg) return errMsg;
  return null;
}
