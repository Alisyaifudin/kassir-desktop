import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";
import { RecordImport } from "~/pages/Setting/Data/RecordUpload/util-validate-record";
import { cache } from "../product/cache";

export function addExternal({
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
  paidAt,
  products,
  extras,
}: RecordImport) {
  const recordId = generateId();
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
      subtotal,
      total,
      now,
      null,
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
      const recordProducts: {
        id: string;
        productId: string;
        isNew: boolean;
      }[] = [];
      for (const product of products) {
        const recordProductId = generateId();
        let productId: string;
        if (product.productId !== undefined) {
          productId = product.productId;
          const eventId = generateId();
          if (mode === "buy") {
            query += `UPDATE products SET product_stock = product_stock + $${bindingIndex++}, 
            product_capital = $${bindingIndex++}, product_name = $${bindingIndex++},
            product_updated_at = $${bindingIndex++}, product_sync_at = null 
            WHERE product_id = $${bindingIndex++};\n
            INSERT INTO product_events (id, created_at, sync_at, type, value, product_id) 
            VALUES ($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
            $${bindingIndex++}, $${bindingIndex++});\n`;
            bindings.push(
              product.qty,
              product.capital,
              product.name,
              now,
              productId,
              eventId,
              now,
              null,
              "inc",
              product.qty,
              productId,
            );
          } else {
            query += `UPDATE products SET product_stock = product_stock - $${bindingIndex++}, 
            product_price = $${bindingIndex++}, product_capital = $${bindingIndex++}, 
            product_name = $${bindingIndex++}, product_updated_at = $${bindingIndex++}, 
            product_sync_at = null 
            WHERE product_id = $${bindingIndex++};\n
            INSERT INTO product_events (id, created_at, sync_at, type, value, product_id) 
            VALUES ($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
            $${bindingIndex++}, $${bindingIndex++});\n`;
            bindings.push(
              product.qty,
              product.price,
              product.capital,
              product.name,
              now,
              productId,
              eventId,
              now,
              null,
              "dec",
              product.qty,
              productId,
            );
          }
          recordProducts.push({
            id: recordProductId,
            productId,
            isNew: false,
          });
        } else {
          productId = generateId();
          recordProducts.push({
            id: recordProductId,
            productId,
            isNew: true,
          });
        }
      }

      const newProductsPlaceholders = recordProducts
        .filter((r) => r.isNew)
        .map(
          () => `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
          $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
        )
        .join(", ");
      const newEventsPlaceholders = recordProducts
        .filter((r) => r.isNew)
        .map(
          () => `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
          $${bindingIndex++})`,
        )
        .join(", ");
      if (newProductsPlaceholders.length > 0) {
        query += `INSERT INTO products (product_id, product_barcode, product_name, product_price,
        product_stock, product_capital, product_note, product_updated_at, product_sync_at) VALUES 
        ${newProductsPlaceholders};\n`;
        for (let i = 0; i < products.length; i++) {
          if (!recordProducts[i].isNew) continue;
          const product = products[i];
          const qty = mode === "buy" ? product.qty : 0;
          bindings.push(
            recordProducts[i].productId,
            null,
            product.name,
            product.price,
            qty,
            product.capital,
            "",
            now,
            null,
          );
        }
        query += `INSERT INTO product_events (id, created_at, sync_at, type, value, product_id) 
        VALUES ${newEventsPlaceholders};\n`;
        for (let i = 0; i < products.length; i++) {
          if (!recordProducts[i].isNew) continue;
          const product = products[i];
          const eventId = generateId();
          const qty = mode === "buy" ? product.qty : 0;
          bindings.push(eventId, now, null, "manual", qty, recordProducts[i].productId);
        }
      }
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
          recordProducts[i].id,
          recordProducts[i].productId,
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
            bindings.push(
              discountId,
              recordProducts[i].id,
              discount.value,
              discount.eff,
              discount.kind,
            );
          }
        }
      }
    }
    yield* DB.try((db) => db.execute(query, bindings));
    cache.revalidate();
    return recordId;
  });
}
