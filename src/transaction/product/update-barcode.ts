import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function barcode(id: string, barcode: string): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () =>
      tx.execute("UPDATE products SET product_barcode = $1 WHERE product_id = $2", [barcode, id]),
  });
  if (errMsg) return errMsg;
  return null;
}
