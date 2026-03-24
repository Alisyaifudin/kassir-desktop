import { Effect } from "effect";
import { count as getCount } from "./count";
import { TooMany } from "~/lib/effect-error";
import { TX, TxError } from "../instance";
import { generateId } from "~/lib/random";
import { add as addProduct } from "../product/add";
import { add as addExtra } from "../extra/add";
import { TabInfo } from "./get-all";
import { DB } from "~/database/instance";

type Record = {
  mode: "buy" | "sell";
  note: string;
  methodId: string;
  fix: number;
  customer: {
    id?: string;
    name: string;
    phone: string;
  };
};

type Discount = {
  kind: DB.DiscKind;
  value: number;
  eff: number;
};

type RecordProduct = {
  productId?: string;
  name: string;
  price: number;
  qty: number;
  discounts: Discount[];
};

type RecordExtra = {
  name: string;
  value: number;
  eff: number;
  kind: DB.ValueKind;
};

type DataRecord = {
  record: Record;
  products: RecordProduct[];
  extras: RecordExtra[];
};

export function addOne({ record, products, extras }: DataRecord) {
  return Effect.gen(function* () {
    const count = yield* getCount();
    if (count >= 100) return yield* Effect.fail(TooMany.new("Terlalu banyak transaksi"));
    const productIds = products.flatMap((p) => (p.productId === undefined ? [] : [p.productId]));
    const productsMap = yield* fetchProduct(productIds);
    const res = yield* TX.try((tx) =>
      tx.execute(
        `INSERT INTO transactions (tx_mode, tx_fix, tx_method_id, tx_note, tx_customer_name, 
         tx_customer_phone, tx_customer_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          record.mode,
          record.fix,
          record.methodId,
          record.note,
          record.customer.name,
          record.customer.phone,
          record.customer.id ?? null,
        ],
      ),
    );

    const tab = res.lastInsertId;
    if (tab === undefined)
      return yield* Effect.fail(TxError.new(new Error("Failed to insert new transaction")));

    yield* Effect.all(
      products.map((p) => {
        const product = p.productId === undefined ? undefined : productsMap.get(p.productId);
        return addProduct({
          id: generateId(),
          tab,
          barcode: product === undefined ? "" : (product.barcode ?? ""),
          name: p.name,
          price: p.price,
          qty: p.qty,
          product,
          discounts: p.discounts.map((d) => ({
            id: generateId(),
            kind: d.kind,
            value: d.value,
          })),
        });
      }),
      { concurrency: 10 },
    );

    yield* Effect.all(
      extras.map((e) =>
        addExtra({
          id: generateId(),
          tab,
          kind: e.kind,
          name: e.name,
          value: e.value,
        }),
      ),
      { concurrency: 10 },
    );

    const info: TabInfo = { mode: record.mode, tab };
    return info;
  });
}

type ProductInfo = {
  id: string;
  name: string;
  barcode?: string;
  capital: number;
  stock: number;
  price: number;
};

function fetchProduct(productIds: string[]) {
  return Effect.gen(function* () {
    const ids = Array.from(new Set(productIds));
    if (ids.length === 0) return new Map<string, ProductInfo>();

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
    const rows = yield* DB.try((db) =>
      db.select<
        {
          product_id: string;
          product_barcode: string | null;
          product_name: string;
          product_capital: number;
          product_price: number;
          product_stock: number;
        }[]
      >(
        `SELECT product_id, product_name, product_barcode, product_capital, product_stock, product_price
         FROM products WHERE product_id IN (${placeholders})`,
        ids,
      ),
    );
    const barcodeMap = new Map<string, ProductInfo>();
    for (const row of rows) {
      barcodeMap.set(row.product_id, {
        id: row.product_id,
        name: row.product_name,
        capital: row.product_capital,
        stock: row.product_stock,
        barcode: row.product_barcode ?? undefined,
        price: row.product_price,
      });
    }
    return barcodeMap;
  });
}
