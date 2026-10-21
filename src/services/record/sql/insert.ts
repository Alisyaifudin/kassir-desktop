/**
 * The `records` / `record_listings` / `discounts` / `record_methods` insert
 * statements, as pure functions.
 *
 * They live apart from `live.ts` for the reason `product/stock-sql.ts` does: a
 * statement is the place a binding goes missing or in the wrong order, and a
 * pure `(input) => Statement` can be pinned by a five-line test instead of a
 * whole-cart integration case. No SQL text was changed in the move.
 */
import type { Statement } from "../../db";
import { generateId } from "~/lib/random";
import type { DiscountKind, RecordMode } from "..";

/** The header columns of a `records` row, as the writers see them. */
export type RecordHeader = {
  createdAt: number;
  paidAt: number | null;
  creditAt: number | null;
  rounding: number;
  cashier: string;
  mode: RecordMode;
  pay: number;
  note: string;
  fix: number;
  customer: { name: string; phone: string };
  supplier: { id: string | null; name: string };
  subTotal: number;
  total: number;
};

export function insertRecordStatement(id: string, input: RecordHeader, now: number): Statement {
  return {
    sql: `INSERT INTO records (
        record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
        record_cashier, record_mode, record_pay, record_note, record_fix,
        record_customer_name, record_customer_phone, record_supplier_id,
        record_supplier_name, record_sub_total, record_total,
        record_updated_at, record_sync_at, record_deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NULL, NULL)`,
    bindings: [
      id,
      input.createdAt,
      input.paidAt,
      input.rounding,
      input.creditAt,
      input.cashier,
      input.mode,
      input.pay,
      input.note,
      input.fix,
      input.customer.name,
      input.customer.phone,
      input.supplier.id,
      input.supplier.name,
      input.subTotal,
      input.total,
      now,
    ],
  };
}

export function insertMethod(recordId: string, methodId: string, pay: number): Statement {
  return {
    sql: `INSERT INTO record_methods (
        record_method_id, record_id, method_id, record_method_pay
      ) VALUES ($1, $2, $3, $4)`,
    bindings: [generateId(), recordId, methodId, pay],
  };
}

/** A `record_listings` portion row. */
export function insertPortion(p: {
  id: string;
  groupId: string;
  recordId: string;
  productEventId: string | null;
  productId: string | null;
  name: string;
  kind: string;
  unit: number;
  price: number;
  qty: number;
  capital: number;
  total: number;
}): Statement {
  return {
    sql: `INSERT INTO record_listings (
        record_listing_id, record_listing_group_id, record_id, product_event_id,
        product_id, record_listing_name, record_listing_kind, record_listing_unit,
        record_listing_price, record_listing_qty, record_listing_capital,
        record_listing_total
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    bindings: [
      p.id,
      p.groupId,
      p.recordId,
      p.productEventId,
      p.productId,
      p.name,
      p.kind,
      p.unit,
      p.price,
      p.qty,
      p.capital,
      p.total,
    ],
  };
}

/** One copy of each discount for a line that is a single portion. */
export function insertDiscounts(
  portionId: string,
  discounts: { kind: DiscountKind; value: number; eff: number }[],
  share: number,
): Statement[] {
  return discounts.map((discount) => ({
    sql: `INSERT INTO discounts (
        discount_id, discount_group_id, record_listing_id, discount_kind,
        discount_value, discount_eff
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
    bindings: [
      generateId(),
      generateId(),
      portionId,
      discount.kind,
      discount.value,
      discount.eff * share,
    ],
  }));
}
