import { DefaultError, NotFound, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";
import Decimal from "decimal.js";
import { setCache } from "../product/caches";

type Input = {
  recordId: number;
  mode: DB.Mode;
  fix: number;
  timestamp: number;
  productId?: number;
  name: string;
  price: number;
  qty: number;
  stock: number;
  capital: number;
  barcode: string;
  total: number;
  discounts: {
    value: number;
    eff: number;
    kind: DB.DiscKind;
  }[];
};

export async function add({
  recordId,
  mode,
  fix,
  timestamp,
  name,
  price,
  capital: capitalRaw,
  qty,
  barcode,
  stock,
  total,
  productId,
  discounts,
}: Input): Promise<DefaultError | NotFound | null> {
  const db = await getDB();
  let capital = capitalRaw;
  if (productId !== undefined) {
    const [errMsg, res] = await tryResult({
      run: () =>
        db.select<{ product_stock: number; product_capital: number; product_price: number }[]>(
          `SELECT product_stock, product_capital, product_price FROM products WHERE product_id = $1`,
          [productId]
        ),
    });
    if (errMsg) return errMsg;
    if (res.length === 0) return "Tidak ditemukan";
    const w1 = new Decimal(capitalRaw).times(qty);
    const w2 = new Decimal(res[0].product_capital).times(res[0].product_stock);
    const t = new Decimal(res[0].product_stock).plus(qty);
    const w = w1.plus(w2);
    capital = Number(w.div(t).toFixed(fix));
    const productCapital = mode === "buy" ? capital : res[0].product_capital;
    const sign = mode === "buy" ? 1 : -1;
    let newStock = res[0].product_stock + sign * qty;
    if (mode === "buy" && res[0].product_stock < 0) {
      newStock = qty;
    }
    const [errUpdate] = await tryResult({
      run: () =>
        db.execute(
          "UPDATE products SET product_stock = $1, product_price = $2, product_name = $3, product_capital = $4 WHERE product_id = $5",
          [
            newStock,
            mode === "sell" ? price : res[0].product_price,
            name,
            productCapital,
            productId,
          ]
        ),
    });
    if (errUpdate !== null) return errUpdate;
    setCache((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return {
            ...p,
            capital: productCapital,
            stock: newStock,
            name,
            price,
          };
        }
        return p;
      })
    );
  } else {
    if (stock < qty) {
      stock = qty;
    }
    const b = barcode.trim() === "" ? null : barcode.trim();
    const [errMsg, res] = await tryResult({
      run: () =>
        db.execute(
          `INSERT INTO products (product_barcode, product_name, product_price, product_stock, product_capital,
           product_note) VALUES ($1, $2, $3, $4, $5, '')`,
          [b, name, price, stock, capital]
        ),
    });
    if (errMsg !== null) return errMsg;
    const id = res.lastInsertId;
    if (id === undefined) return "Aplikasi bermasalah";
    setCache((prev) => [
      ...prev,
      {
        capital,
        id,
        name,
        price,
        stock,
        barcode: b ?? undefined,
      },
    ]);
    productId = id;
  }
  const [errMsg, res] = await tryResult({
    run: () =>
      db.execute(
        `INSERT INTO record_products (product_id, record_product_id, timestamp, record_product_name, record_product_price,
         record_product_qty, record_product_capital, record_product_capital_raw, record_product_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [productId, recordId, timestamp, name, price, qty, capital, capitalRaw, total]
      ),
  });
  if (errMsg !== null) return errMsg;
  const id = res.lastInsertId;
  if (id === undefined) return "Aplikasi bermasalah";
  const promises: Promise<Result<DefaultError, any>>[] = [];
  for (const d of discounts) {
    promises.push(
      tryResult({
        run: () =>
          db.execute(
            `INSERT INTO discounts (record_product_id, discount_kind, discount_value, discount_eff) VALUES ($1, $2, $3, $4)`,
            [id, d.kind, d.value, d.eff]
          ),
      })
    );
  }
  const promRes = await Promise.all(promises);
  for (const [errMsg] of promRes) {
    if (errMsg !== null) return errMsg;
  }
  return null;
}
