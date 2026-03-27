import { Effect } from "effect";
import { DB } from "../instance";

type RecordExtra = {
  id: string;
  name: string;
  recordId: string;
  value: number;
  eff: number;
  kind: DB.ValueKind;
};

type Discount = {
  id: string;
  kind: DB.DiscKind;
  value: number;
  eff: number;
};

type RecordProduct = {
  productId?: string;
  id: string;
  recordId: string;
  name: string;
  price: number;
  qty: number;
  capital: number;
  capitalRaw: number;
  total: number;
  discounts: Discount[];
};

type Input = {
  isCredit: boolean;
  id: string;
  paidAt: number;
  updatedAt: number;
  cashier: string;
  mode: DB.Mode;
  pay: number;
  rounding: number;
  note: string;
  methodId: string;
  fix: number;
  customer?: {
    name: string;
    phone: string;
    id: string;
  };
  subtotal: number;
  total: number;
  products: RecordProduct[];
  extras: RecordExtra[];
};

export function upsert({
  cashier,
  id,
  updatedAt,
  paidAt,
  customer,
  fix,
  isCredit,
  methodId,
  mode,
  note,
  pay,
  rounding,
  subtotal,
  total,
  extras,
  products,
}: Input) {
  return Effect.gen(function* () {
    const check = yield* DB.try((db) =>
      db.select<{ record_id: string }[]>(`SELECT record_id FROM records WHERE record_id = $1`, [
        id,
      ]),
    );
    const now = Date.now();
    if (check.length > 0) {
      // update
      yield* DB.try((db) =>
        db.execute(
          `UPDATE records SET record_paid_at = $1, record_rounding = $2, record_is_credit = $3, record_mode = $4,
         record_pay = $5, record_note = $6, method_id = $7, record_updated_at = $8, record_sync_at = $9
         WHERE record_id = $10`,
          [paidAt, rounding, isCredit ? 1 : 0, mode, pay, note, methodId, updatedAt, now, id],
        ),
      );
      return;
    }
    // insert
    const bindings: (number | string | null)[] = [];
    let bindingIndex = 1;
    let query = "";
    query += `INSERT INTO records (record_id, record_paid_at, record_rounding, record_is_credit, 
    record_cashier, record_mode, record_pay, record_note, method_id, record_fix, record_customer_name, 
    record_customer_phone, record_sub_total, record_total, record_updated_at, record_sync_at)
    VALUES ($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
    $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
    $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
    $${bindingIndex++}, $${bindingIndex++});\n`;
    bindings.push(
      id,
      paidAt,
      rounding,
      isCredit ? 1 : 0,
      cashier,
      mode,
      pay,
      note,
      methodId,
      fix,
      customer?.name ?? "",
      customer?.phone ?? "",
      subtotal,
      total,
      updatedAt,
      now,
    );

    if (extras.length > 0) {
      const extraPlaceholders = extras
        .map(
          () => `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
         $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
        )
        .join(", ");
      query += `INSERT INTO record_extras (record_extra_id, record_extra_name, record_id, 
      record_extra_value, record_extra_eff, record_extra_kind)
      VALUES ${extraPlaceholders};\n`;
      for (const extra of extras) {
        bindings.push(extra.id, extra.name, id, extra.value, extra.eff, extra.kind);
      }
    }

    if (products.length > 0) {
      const recordProductPlaceholders = products
        .map(
          () => `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++},
         $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
        )
        .join(", ");
      query += `INSERT INTO record_products (record_product_id, product_id, record_id, record_product_name, 
      record_product_price, record_product_qty, record_product_capital, record_product_capital_raw, 
      record_product_total) VALUES ${recordProductPlaceholders};\n`;
      for (const product of products) {
        bindings.push(
          product.id,
          product.productId ?? null,
          id,
          product.name,
          product.price,
          product.qty,
          product.capital,
          product.capitalRaw,
          product.total,
        );
      }
      for (const product of products) {
        const filteredDiscounts = product.discounts.filter((d) => d.eff !== 0);
        if (filteredDiscounts.length > 0) {
          const placeholders = filteredDiscounts
            .map(
              () =>
                `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
            )
            .join(", ");
          query += `INSERT INTO discounts (discount_id, record_product_id, discount_value, 
          discount_eff, discount_kind) VALUES ${placeholders};\n`;
          for (const discount of filteredDiscounts) {
            bindings.push(discount.id, product.id, discount.value, discount.eff, discount.kind);
          }
        }
      }
    }
    const wrappedQuery = `BEGIN;\n${query}COMMIT;`;
    yield* DB.try((db) => db.execute(wrappedQuery, bindings));
  });
}
