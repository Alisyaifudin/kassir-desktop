import { DefaultError, err, ok, ResultOld, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function getLastId(): Promise<ResultOld<DefaultError, number>> {
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
