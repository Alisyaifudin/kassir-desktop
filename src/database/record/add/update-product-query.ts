import { generateId } from "~/lib/random";
import { RecordType } from "./type";
import { ProductInStock } from "./get-products";

export function updateProductQuery({
  mode,
  productFulls,
  bind,
  now,
  recordProducts,
  productsInStock,
}: {
  mode: DB.Mode;
  productFulls: RecordType.ProductFull[];
  now: number;
  bind: {
    index: number;
    values: (number | string | null)[];
  };
  recordProducts: {
    id: string;
    productId: string;
    isNew: boolean;
  }[];
  productsInStock: Map<string, ProductInStock>;
}) {
  let query = "";
  for (const product of productFulls) {
    const recordProductId = generateId();
    if (product.product?.id !== undefined) {
      const productId = product.product.id;
      const currentStock = Math.max(0, productsInStock.get(productId)?.stock ?? 0);
      const qty = product.qty;
      const newStock = mode === "buy" ? currentStock + qty : currentStock - qty;
      const clampedStock = Math.max(0, newStock);
      const eventId = generateId();
      if (mode === "buy") {
        query += `UPDATE products SET product_stock = $${bind.index++}, 
            product_capital = $${bind.index++}, product_name = $${bind.index++},
            product_updated_at = $${bind.index++}, product_sync_at = null 
            WHERE product_id = $${bind.index++};\n
            INSERT INTO product_events (id, created_at, sync_at, type, value, product_id) 
            VALUES ($${bind.index++}, $${bind.index++}, $${bind.index++}, $${bind.index++}, 
            $${bind.index++}, $${bind.index++});\n`;
        bind.values.push(
          clampedStock,
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
        query += `UPDATE products SET product_stock = $${bind.index++}, 
            product_name = $${bind.index++},
            product_updated_at = $${bind.index++}, product_sync_at = null 
            WHERE product_id = $${bind.index++};\n
            INSERT INTO product_events (id, created_at, sync_at, type, value, product_id) 
            VALUES ($${bind.index++}, $${bind.index++}, $${bind.index++}, $${bind.index++}, 
            $${bind.index++}, $${bind.index++});\n`;
        bind.values.push(
          clampedStock,
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
      recordProducts.push({
        id: recordProductId,
        productId: generateId(),
        isNew: true,
      });
    }
  }
  return query;
}
