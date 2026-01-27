import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";
import Database from "@tauri-apps/plugin-sql";

export async function updateMode(timestamp: number, mode: DB.Mode): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute("UPDATE records SET record_mode = $1 WHERE timestamp = $2", [mode, timestamp]),
  });
  if (errMsg !== null) return errMsg;
  if (mode === "buy") {
    const errMsg = await toBuy(timestamp, db);
    if (errMsg !== null) return errMsg;
  } else {
    const errMsg = await toSell(timestamp, db);
    if (errMsg !== null) return errMsg;
  }
  return null;
}

async function toSell(timestamp: number, db: Database) {
  const [errMsg, products] = await tryResult({
    run: () =>
      db.select<{ product_id: number; record_product_qty: number }[]>(
        `SELECT product_id, record_product_qty FROM record_products WHERE timestamp = $1 AND product_id IS NOT NULL`,
        [timestamp]
      ),
  });
  if (errMsg !== null) return errMsg;
  const promises: Promise<DefaultError | null>[] = [];
  for (const p of products) {
    promises.push(
      (async () => {
        const [errProd, res] = await tryResult({
          run: () =>
            db.select<{ record_product_capital: number }[]>(
              `SELECT record_product_capital 
             FROM record_products
             INNER JOIN records ON records.timestamp = record_products.timestamp
             WHERE record_mode = 'buy' AND product_id = $1 AND record_products.timestamp < $2
             ORDER BY record_products.timestamp DESC
             LIMIT 1`,
              [p.product_id, timestamp]
            ),
        });
        if (errProd !== null) return errProd;
        const capital = res.length === 0 ? 0 : res[0].record_product_capital;
        const [errMsg] = await tryResult({
          run: () =>
            db.execute(
              `UPDATE products SET product_capital = $1, product_stock = product_stock - $2 WHERE product_id = $3`,
              [capital, 2 * p.record_product_qty, p.product_id]
            ),
        });
        return errMsg;
      })()
    );
  }
  const res = await Promise.all(promises);
  for (const errMsg of res) {
    if (errMsg !== null) return errMsg;
  }
  return null;
}

async function toBuy(timestamp: number, db: Database): Promise<DefaultError | null> {
  const [errMsg, products] = await tryResult({
    run: () =>
      db.select<
        { product_id: number; record_product_qty: number; record_product_capital: number }[]
      >(
        `SELECT product_id, record_product_qty, record_product_capital FROM record_products WHERE timestamp = $1 AND product_id IS NOT NULL`,
        [timestamp]
      ),
  });
  if (errMsg !== null) return errMsg;
  const promises: Promise<DefaultError | null>[] = [];
  for (const p of products) {
    promises.push(
      (async () => {
        const [errMsg] = await tryResult({
          run: () =>
            db.execute(
              `UPDATE products SET product_capital = $1, product_stock = product_stock + $2 WHERE product_id = $3`,
              [p.record_product_capital, 2 * p.record_product_qty, p.product_id]
            ),
        });
        return errMsg;
      })()
    );
  }
  const res = await Promise.all(promises);
  for (const errMsg of res) {
    if (errMsg !== null) return errMsg;
  }
  return null;
}
