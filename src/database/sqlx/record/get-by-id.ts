import { DB } from "../instance";
import { Effect } from "effect";

type RecordDb = {
  id: string;
  createdAt: number;
  paidAt: number;
  rounding: number;
  creditAt?: number;
  cashier: string;
  mode: DB.Mode;
  pay: number;
  note: string;
  fix: number;
  subtotal: number;
  total: number;
  updatedAt: number;
  method: {
    id: string;
    name?: string;
    kind: DB.MethodEnum;
  };
  customer?: {
    id: string;
    name: string;
    phone: string;
  };
  product?: {
    id: string;
    name: string;
    price: number;
    qty: number;
    capital: number;
    total: number;
  };
  discount?: {
    productId: string;
    id: string;
    value: number;
    eff: number;
    kind: DB.DiscKind;
  };
  extra?: {
    id: string;
    name: string;
    value: number;
    eff: number;
    kind: DB.ValueKind;
  };
};

type OutputDb = {
  record_id: string;
  record_created_at: number;
  timestamp: number;
  record_rounding: number;
  record_credit_at: number | null;
  record_cashier: string;
  record_mode: DB.Mode;
  record_pay: number;
  record_note: string;
  record_fix: number;
  record_sub_total: number;
  record_total: number;
  record_updated_at: number;
  method_id: string;
  method_name: string | null;
  method_kind: DB.MethodEnum;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  record_product_id: string | null;
  record_product_name: string | null;
  record_product_price: number | null;
  record_product_qty: number | null;
  record_product_capital: number | null;
  record_product_total: number | null;
  discount_id: string | null;
  discount_value: number | null;
  discount_eff: number | null;
  discount_kind: DB.DiscKind | null;
  record_extra_id: string | null;
  record_extra_name: string | null;
  record_extra_value: number | null;
  record_extra_eff: number | null;
  record_extra_kind: DB.ValueKind | null;
};

export function getRecordById(id: string) {
  return DB.select<OutputDb[]>(
    `SELECT
      r.record_id, r.record_created_at, r.timestamp, r.record_rounding,
      r.record_credit_at, r.record_cashier, r.record_mode, r.record_pay,
      r.record_note, r.record_fix, r.record_sub_total, r.record_total,
      r.record_updated_at,
      m.method_id, m.method_name, m.method_kind,
      c.customer_id, c.customer_name, c.customer_phone,
      rp.record_product_id, rp.record_product_name, rp.record_product_price,
      rp.record_product_qty, rp.record_product_capital, rp.record_product_total,
      d.discount_id, d.discount_value, d.discount_eff, d.discount_kind,
      re.record_extra_id, re.record_extra_name, re.record_extra_value,
      re.record_extra_eff, re.record_extra_kind
    FROM records r
    INNER JOIN methods m ON r.method_id = m.method_id
    LEFT JOIN customers c ON r.customer_id = c.customer_id
    LEFT JOIN record_products rp ON r.record_id = rp.record_id
    LEFT JOIN discounts d ON rp.record_product_id = d.record_product_id
    LEFT JOIN record_extras re ON r.record_id = re.record_id
    WHERE r.record_id = $1`,
    [id],
  ).pipe(
    Effect.map((res) =>
      res.map((r) => {
        const data: RecordDb = {
          id: r.record_id,
          createdAt: r.record_created_at,
          paidAt: r.timestamp,
          rounding: r.record_rounding,
          creditAt: r.record_credit_at ?? undefined,
          cashier: r.record_cashier,
          mode: r.record_mode,
          pay: r.record_pay,
          note: r.record_note,
          fix: r.record_fix,
          subtotal: r.record_sub_total,
          total: r.record_total,
          updatedAt: r.record_updated_at,
          method: {
            id: r.method_id,
            name: r.method_name ?? undefined,
            kind: r.method_kind,
          },
          customer: r.customer_id
            ? { id: r.customer_id, name: r.customer_name!, phone: r.customer_phone! }
            : undefined,
          product: r.record_product_id
            ? {
                id: r.record_product_id,
                name: r.record_product_name!,
                price: r.record_product_price!,
                qty: r.record_product_qty!,
                capital: r.record_product_capital!,
                total: r.record_product_total!,
              }
            : undefined,
          discount: r.discount_id
            ? {
                productId: r.record_product_id!,
                id: r.discount_id,
                value: r.discount_value!,
                eff: r.discount_eff!,
                kind: r.discount_kind!,
              }
            : undefined,
          extra: r.record_extra_id
            ? {
                id: r.record_extra_id,
                name: r.record_extra_name!,
                value: r.record_extra_value!,
                eff: r.record_extra_eff!,
                kind: r.record_extra_kind!,
              }
            : undefined,
        };
        return data;
      }),
    ),
  );
}
