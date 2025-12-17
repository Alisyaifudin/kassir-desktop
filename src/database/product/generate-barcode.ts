import { err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";
import { findNextBarcode, genBarcode } from "~/lib/barcode";
import { getCache, setCache } from "./caches";

export async function generateBarcode(id: number): Promise<Result<"Aplikasi bermasalah", string>> {
  const db = await getDB();
  const [errMsg, res] = await tryResult({
    run: () =>
      db.select<{ barcode: string }[]>(
        `SELECT product_barcode AS barcode FROM products WHERE product_barcode LIKE '2123456%'
				 ORDER BY product_barcode ASC`
      ),
  });
  if (errMsg) return err(errMsg);
  let num = 0;
  if (res.length > 0) {
    num = findNextBarcode(
      res.filter((r) => r.barcode.length === 13).map((r) => Number(r.barcode.slice(7, -1)))
    );
  }
  const barcode = genBarcode(num);
  const [errUpdate] = await tryResult({
    run: () =>
      db.execute("UPDATE products SET product_barcode = $1 WHERE product_id = $2", [
        barcode.toString(),
        id,
      ]),
  });
  if (errUpdate) return err(errUpdate);
  const cache = getCache();
  if (cache !== null) {
    setCache((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            barcode: barcode.toString(),
          };
        }
        return p;
      })
    );
  }
  return ok(barcode.toString());
}
