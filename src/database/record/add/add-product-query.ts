import { generateId } from "~/lib/random";
import { RecordType } from "./type";

export function addProductQuery({
  recordProducts,
  bind,
  productFulls,
  mode,
  now,
}: {
  recordProducts: {
    id: string;
    productId: string;
    isNew: boolean;
  }[];
  bind: {
    index: number;
    values: (number | string | null)[];
  };
  mode: DB.Mode;
  productFulls: RecordType.ProductFull[];
  now: number;
}) {
  let query = "";
  const newProductsPlaceholders = recordProducts
    .filter((r) => r.isNew)
    .map(
      () => `($${bind.index++}, $${bind.index++}, $${bind.index++}, $${bind.index++}, $${bind.index++}, 
          $${bind.index++}, $${bind.index++}, $${bind.index++}, $${bind.index++})`,
    )
    .join(", ");
  const newEventsPlaceholders = recordProducts
    .filter((r) => r.isNew)
    .map(
      () => `($${bind.index++}, $${bind.index++}, $${bind.index++}, $${bind.index++}, $${bind.index++}, 
          $${bind.index++})`,
    )
    .join(", ");
  if (newProductsPlaceholders.length > 0) {
    query += `INSERT INTO products (product_id, product_barcode, product_name, product_price,
        product_stock, product_capital, product_note, product_updated_at, product_sync_at) VALUES 
        ${newProductsPlaceholders};\n`;
    // collect bindings
    for (let i = 0; i < productFulls.length; i++) {
      if (!recordProducts[i].isNew) continue;
      const product = productFulls[i];
      const qty = mode === "buy" ? product.qty : 0;
      bind.values.push(
        recordProducts[i].productId,
        product.barcode.trim() === "" ? null : product.barcode.trim(),
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
    for (let i = 0; i < productFulls.length; i++) {
      if (!recordProducts[i].isNew) continue;
      const product = productFulls[i];
      const eventId = generateId();
      const qty = mode === "buy" ? product.qty : 0;
      bind.values.push(eventId, now, null, "manual", qty, recordProducts[i].productId);
    }
  }
  return query;
}
