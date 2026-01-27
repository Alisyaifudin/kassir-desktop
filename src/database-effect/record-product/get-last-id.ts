import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function getLastId(): Promise<Result<DefaultError, number>> {
  const db = await getDB();
  const [errMsg, rows] = await tryResult({
    run: () =>
      db.select<{ id: number }[]>(`SELECT MAX(record_product_id) AS id FROM record_products`),
  });
  if (errMsg !== null) return err(errMsg);
  if (rows.length === 0) {
    return ok(0);
  }
  return ok(rows[0].id);
}
