import { Effect } from "effect";
import { DB } from "../instance";
import { RecordImport } from "~/pages/Setting/Data/RecordUpload/util-validate-record";
import { METHOD_BASE_ID } from "~/lib/constants";

export function addExternal({
  cashier,
  customer,
  fix,
  isCredit,
  paidAt,
  mode,
  method,
  rounding,
  note,
  pay,
  subTotal,
  total,
  products,
  extras,
}: RecordImport) {
  const timestamp = Date.now();
  return Effect.gen(function* () {
    const methodId = yield* fetchMethod(method);
    const bindings: (number | string | null)[] = [];
    let bindingIndex = 1;
    let query = "";
    query += `INSERT INTO records (timestamp, record_paid_at, record_rounding, record_is_credit, record_cashier, record_mode, record_pay, record_note, 
        method_id, record_fix, record_customer_name, record_customer_phone, record_sub_total, record_total)
        VALUES ($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
        $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++});\n`;
    bindings.push(
      timestamp,
      paidAt,
      rounding,
      isCredit ? 1 : 0,
      cashier,
      mode,
      pay,
      note,
      methodId,
      fix,
      customer.name,
      customer.phone,
      subTotal,
      total,
    );

    if (extras.length > 0) {
      query += `INSERT INTO record_extras (record_extra_name, timestamp, record_extra_value, record_extra_eff, record_extra_kind)
         VALUES ${extras.map(() => `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`).join(", ")};\n`;
      for (const extra of extras) {
        bindings.push(extra.name, timestamp, extra.value, extra.eff, extra.kind);
      }
    }

    if (products.length > 0) {
      query += `INSERT INTO record_products (product_id, timestamp, record_product_name, record_product_price,
         record_product_qty, record_product_capital, record_product_capital_raw, record_product_total)
         VALUES ${products
           .map(
             () => `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++},
                     $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
           )
           .join(", ")};\n`;

      for (const product of products) {
        bindings.push(
          null,
          timestamp,
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
          const productIndex = products.indexOf(product);
          query += `INSERT INTO discounts (record_product_id, discount_value, discount_eff, discount_kind) VALUES ${filteredDiscounts
            .map(
              () =>
                `((SELECT record_product_id FROM record_products WHERE timestamp = $1 LIMIT 1 OFFSET ${productIndex}), $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
            )
            .join(", ")};\n`;
          for (const discount of filteredDiscounts) {
            bindings.push(discount.value, discount.eff, discount.kind);
          }
        }
      }
    }
    yield* DB.try((db) => db.execute(query, bindings));
    return timestamp;
  });
}

function fetchMethod(method: { name?: string; kind: DB.MethodEnum }) {
  return Effect.gen(function* () {
    if (method.name !== undefined) {
      const methods = yield* DB.try((db) =>
        db.select<{ method_id: number }[]>(
          `SELECT method_id FROM methods WHERE method_name = $1 AND method_kind = $2`,
          [method.name, method.kind],
        ),
      );
      if (methods.length === 0) {
        const res = yield* DB.try((db) =>
          db.execute("INSERT INTO methods (method_name, method_kind) VALUES ($1, $2)", [
            method.name,
            method.kind,
          ]),
        );
        return res.lastInsertId!;
      }
      return methods[0].method_id;
    } else {
      return METHOD_BASE_ID[method.kind];
    }
  });
}
