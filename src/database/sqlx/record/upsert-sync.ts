import { DB } from "../instance";
import { Effect } from "effect";
import { createBindings } from "~/lib/bind";

type RecordExtra = {
  id: string;
  name: string;
  value: number;
  eff: number;
  kind: DB.ValueKind;
};

type Discount = {
  id: string;
  value: number;
  eff: number;
  kind: DB.DiscKind;
};

type RecordProduct = {
  id: string;
  productEventId: string;
  name: string;
  price: number;
  qty: number;
  capital: number;
  total: number;
  discounts: Discount[];
};

export type UpsertRecord = {
  id: string;
  methodId: string;
  paidAt: number;
  createdAt: number;
  rounding: number;
  creditAt?: number;
  cashier: string;
  mode: DB.Mode;
  pay: number;
  note: string;
  fix: number;
  customer?: {
    id: string;
    name: string;
    phone: string;
  };
  subtotal: number;
  total: number;
  updatedAt: number;
  products: RecordProduct[];
  extras: RecordExtra[];
};

export function upsertRecordSync(record: UpsertRecord, now: number) {
  const { bind, bindings } = createBindings();
  const queries: string[] = [];

  // --- Customer upsert (if provided) ---
  if (record.customer) {
    queries.push(
      `INSERT INTO customers (customer_id, customer_name, customer_phone, customer_updated_at, customer_sync_at)
       VALUES (${bind(record.customer.id)}, ${bind(record.customer.name)}, ${bind(record.customer.phone)}, ${bind(now)}, ${bind(now)})
       ON CONFLICT (customer_id) DO UPDATE SET
         customer_name = excluded.customer_name,
         customer_phone = excluded.customer_phone,
         customer_updated_at = excluded.customer_updated_at,
         customer_sync_at = excluded.customer_sync_at`,
    );
  }

  // --- Record upsert ---
  queries.push(
    `INSERT INTO records (record_id, record_created_at, timestamp, record_rounding,
       record_credit_at, record_cashier, record_mode, record_pay, record_note,
       method_id, record_fix, customer_id, record_sub_total, record_total,
       record_updated_at, record_sync_at)
     VALUES (${bind(record.id)}, ${bind(record.createdAt)}, ${bind(record.paidAt)}, ${bind(record.rounding)},
       ${bind(record.creditAt ?? null)}, ${bind(record.cashier)}, ${bind(record.mode)}, ${bind(record.pay)}, ${bind(record.note)},
       ${bind(record.methodId)}, ${bind(record.fix)}, ${bind(record.customer?.id ?? null)}, ${bind(record.subtotal)}, ${bind(record.total)},
       ${bind(record.updatedAt)}, ${bind(now)})
     ON CONFLICT (record_id) DO UPDATE SET
       record_created_at = excluded.record_created_at,
       timestamp = excluded.timestamp,
       record_rounding = excluded.record_rounding,
       record_credit_at = excluded.record_credit_at,
       record_cashier = excluded.record_cashier,
       record_mode = excluded.record_mode,
       record_pay = excluded.record_pay,
       record_note = excluded.record_note,
       method_id = excluded.method_id,
       record_fix = excluded.record_fix,
       customer_id = excluded.customer_id,
       record_sub_total = excluded.record_sub_total,
       record_total = excluded.record_total,
       record_updated_at = excluded.record_updated_at,
       record_sync_at = excluded.record_sync_at`,
  );

  // --- Record products + discounts ---
  for (const product of record.products) {
    queries.push(
      `INSERT INTO record_products (record_product_id, product_event_id, record_id, record_product_name,
         record_product_price, record_product_qty, record_product_capital, record_product_total)
       VALUES (${bind(product.id)}, ${bind(product.productEventId)}, ${bind(record.id)}, ${bind(product.name)},
         ${bind(product.price)}, ${bind(product.qty)}, ${bind(product.capital)}, ${bind(product.total)})
       ON CONFLICT (record_product_id) DO UPDATE SET
         product_event_id = excluded.product_event_id,
         record_id = excluded.record_id,
         record_product_name = excluded.record_product_name,
         record_product_price = excluded.record_product_price,
         record_product_qty = excluded.record_product_qty,
         record_product_capital = excluded.record_product_capital,
         record_product_total = excluded.record_product_total`,
    );

    for (const discount of product.discounts) {
      queries.push(
        `INSERT INTO discounts (discount_id, record_product_id, discount_value, discount_eff, discount_kind)
         VALUES (${bind(discount.id)}, ${bind(product.id)}, ${bind(discount.value)}, ${bind(discount.eff)}, ${bind(discount.kind)})
         ON CONFLICT (discount_id) DO UPDATE SET
           record_product_id = excluded.record_product_id,
           discount_value = excluded.discount_value,
           discount_eff = excluded.discount_eff,
           discount_kind = excluded.discount_kind`,
      );
    }
  }

  // --- Record extras ---
  for (const extra of record.extras) {
    queries.push(
      `INSERT INTO record_extras (record_extra_id, record_extra_name, record_id,
         record_extra_value, record_extra_eff, record_extra_kind)
       VALUES (${bind(extra.id)}, ${bind(extra.name)}, ${bind(record.id)},
         ${bind(extra.value)}, ${bind(extra.eff)}, ${bind(extra.kind)})
       ON CONFLICT (record_extra_id) DO UPDATE SET
         record_extra_name = excluded.record_extra_name,
         record_id = excluded.record_id,
         record_extra_value = excluded.record_extra_value,
         record_extra_eff = excluded.record_extra_eff,
         record_extra_kind = excluded.record_extra_kind`,
    );
  }

  return DB.execute(`BEGIN TRANSACTION;${queries.join(";\n")}COMMIT;`, bindings).pipe(
    Effect.as(record.id),
  );
}
