import { generateId } from "~/lib/random";
import { RecordType } from "./type";

export function insertRecordProducts({
  productFulls,
  recordProducts,
  recordId,
  bind,
}: {
  productFulls: RecordType.ProductFull[];
  recordProducts: {
    id: string;
    productId: string;
    isNew: boolean;
  }[];
  recordId: string;
  bind: {
    index: number;
    values: (number | string | null)[];
  };
}) {
  let query = "";

  const placeholders = productFulls
    .map(
      () =>
        `($${bind.index++}, $${bind.index++}, $${bind.index++}, $${bind.index++}, $${bind.index++},
         $${bind.index++}, $${bind.index++}, $${bind.index++}, $${bind.index++})`,
    )
    .join(", ");
  query += `INSERT INTO record_products (record_product_id, product_id, record_id, record_product_name, 
    record_product_price, record_product_qty, record_product_capital, record_product_capital_raw, 
    record_product_total) VALUES ${placeholders};\n`;
  for (let i = 0; i < productFulls.length; i++) {
    const product = productFulls[i];
    bind.values.push(
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

  for (let i = 0; i < productFulls.length; i++) {
    const product = productFulls[i];
    const filtered = product.discounts.filter((d) => d.eff !== 0);
    if (filtered.length === 0) continue;
    const discPlaceholders = filtered
      .map(
        () =>
          `($${bind.index++}, $${bind.index++}, $${bind.index++}, $${bind.index++}, $${bind.index++})`,
      )
      .join(", ");
    query += `INSERT INTO discounts (discount_id, record_product_id, discount_value, 
      discount_eff, discount_kind) VALUES ${discPlaceholders};\n`;
    for (const discount of filtered) {
      bind.values.push(
        generateId(),
        recordProducts[i].id,
        discount.value,
        discount.eff,
        discount.kind,
      );
    }
  }

  return query;
}
