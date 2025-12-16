import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export type Discount = {
  id: number;
  kind: DB.DiscKind;
  value: number;
  eff: number;
};

export type RecordProduct = {
  productId?: number;
  id: number;
  timestamp: number;
  name: string;
  price: number;
  qty: number;
  capital: number;
  capitalRaw: number;
  total: number;
  discounts: Discount[];
};

export async function getByRange(
  start: number,
  end: number
): Promise<Result<DefaultError, RecordProduct[]>> {
  const db = await getDB();
  const [errMsg, rows] = await tryResult({
    run: () =>
      db.select<
        (DB.RecordProduct & {
          discount_id: number | null;
          discount_kind: DB.DiscKind | null;
          discount_value: number | null;
          discount_eff: number | null;
        })[]
      >(
        `SELECT timestamp, product_id, records_products.record_product_id, record_product_name, record_product_price,
        record_product_qty, record_product_capital, record_product_capital_raw, record_product_total,
        discount_id, discount_kind, discount_value, discount_eff
        FROM record_products LEFT JOIN discounts ON record_products.record_product_id = discounts.record_product_id
        WHERE timestamp BETWEEN $1 AND $2`,
        [start, end]
      ),
  });
  if (errMsg !== null) return err(errMsg);
  const items: Map<number, RecordProduct> = new Map();
  for (const row of rows) {
    const discount = collectDiscount(
      row.discount_id,
      row.discount_kind,
      row.discount_value,
      row.discount_eff
    );
    const item = items.get(row.record_product_id);
    if (item === undefined) {
      items.set(row.record_product_id, {
        id: row.record_product_id,
        capital: row.record_product_capital,
        capitalRaw: row.record_product_capital_raw,
        discounts: discount === undefined ? [] : [discount],
        name: row.record_product_name,
        price: row.record_product_price,
        qty: row.record_product_qty,
        timestamp: row.timestamp,
        total: row.record_product_total,
        productId: row.product_id ?? undefined,
      });
    } else if (discount !== undefined) {
      item.discounts.push(discount);
    }
  }
  return ok(Array.from(items.values()));
}

function collectDiscount(
  id: number | null,
  kind: DB.DiscKind | null,
  value: number | null,
  eff: number | null
): Discount | undefined {
  if (id === null || kind === null || value === null || eff === null) return undefined;
  return {
    eff,
    id,
    kind,
    value,
  };
}
