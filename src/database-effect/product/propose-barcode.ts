import { err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";
import { findNextBarcode, genBarcode } from "~/lib/barcode";

export async function proposeBarcode(): Promise<Result<"Aplikasi bermasalah", string>> {
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
  return ok(barcode.toString());
}
