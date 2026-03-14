import { Effect } from "effect";
import { count as getCount } from "./count";
import { TooMany } from "~/lib/effect-error";
import { DataRecord } from "~/pages/Record/use-records";
import { TX, TxError } from "../instance";
import { generateId } from "~/lib/random";
import { add as addProduct } from "../product/add";
import { add as addExtra } from "../extra/add";
import { TabInfo } from "./get-all";
import { DB } from "~/database/instance";

export function addOne({ record, products, extras }: DataRecord) {
  return Effect.gen(function* () {
    const count = yield* getCount();
    if (count >= 100) return yield* Effect.fail(TooMany.new("Terlalu banyak transaksi"));
    const productIds = products.map((p) => p.productId);
    const barcodeMap = yield* fetchBarcode(productIds);
    const res = yield* TX.try((tx) =>
      tx.execute(
        `INSERT INTO transactions (tx_mode, tx_fix, tx_method_id, tx_note, tx_customer_name, tx_customer_phone) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          record.mode,
          record.fix,
          record.method.id,
          record.note,
          record.customer.name,
          record.customer.phone,
        ],
      ),
    );

    const tab = res.lastInsertId;
    if (tab === undefined)
      return yield* Effect.fail(TxError.new(new Error("Failed to insert new transaction")));

    yield* Effect.all(
      products.map((p) =>
        addProduct({
          id: generateId(),
          tab,
          barcode: p.productId ? (barcodeMap.get(p.productId) ?? "") : "",
          name: p.name,
          price: p.price,
          qty: p.qty,
          stock: p.qty, // at least equal to qty
          product: p.productId
            ? {
                id: p.productId,
                name: p.name,
                price: p.price,
              }
            : undefined,
          discounts: p.discounts.map((d) => ({
            id: generateId(),
            kind: d.kind,
            value: d.value,
          })),
        }),
      ),
      { concurrency: 10 },
    );

    yield* Effect.all(
      extras.map((e) =>
        addExtra({
          id: generateId(),
          tab,
          kind: e.kind,
          name: e.name,
          saved: false,
          value: e.value,
        }),
      ),
      { concurrency: 10 },
    );

    const info: TabInfo = { mode: record.mode, tab };
    return info;
  });
}

function fetchBarcode(productIds: (number | undefined)[]) {
  return Effect.gen(function* () {
    const ids = Array.from(new Set(productIds.filter((id): id is number => id !== undefined)));
    if (ids.length === 0) return new Map<number, string>();

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
    const rows = yield* DB.try((db) =>
      db.select<{ product_id: number; product_barcode: string | null }[]>(
        `SELECT product_id, product_barcode FROM products WHERE product_id IN (${placeholders})`,
        ids,
      ),
    );
    const barcodeMap = new Map<number, string>();
    for (const row of rows) {
      if (row.product_barcode !== null) barcodeMap.set(row.product_id, row.product_barcode);
    }
    return barcodeMap;
  });
}
