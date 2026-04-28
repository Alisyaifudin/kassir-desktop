import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";
import { cache } from "../product/cache";
import { RecordServer } from "~/server/record/get";

export function addSync({
  id: recordId,
  updatedAt,
  cashier,
  customer,
  fix,
  isCredit,
  methodId,
  mode,
  rounding,
  note,
  pay,
  subtotal,
  total,
  products,
  extras,
}: RecordServer) {
  const now = Date.now();
  return Effect.gen(function* () {
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
      recordId,
      now,
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
        const id = generateId();
        bindings.push(id, extra.name, recordId, extra.value, extra.eff, extra.kind);
      }
    }

    if (products.length > 0) {
      // insert record product
      const recordProductPlaceholders = products
        .map(
          () => `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++},
         $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
        )
        .join(", ");
      query += `INSERT INTO record_products (record_product_id, product_id, record_id, record_product_name, 
      record_product_price, record_product_qty, record_product_capital, record_product_capital_raw, 
      record_product_total) VALUES ${recordProductPlaceholders};\n`;
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        bindings.push(
          product.id,
          product.productId ?? null,
          recordId,
          product.name,
          product.price,
          product.qty,
          product.capital,
          product.capitalRaw,
          product.total,
        );
      }
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
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
            const discountId = generateId();
            bindings.push(discountId, product.id, discount.value, discount.eff, discount.kind);
          }
        }
      }
    }
    const wrappedQuery = `BEGIN;\n${query}COMMIT;`;
    yield* DB.try((db) => db.execute(wrappedQuery, bindings));
    cache.revalidate();
    return recordId;
  });
}
