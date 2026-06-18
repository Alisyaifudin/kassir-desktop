import { sqlx } from "~/database/sqlx";

export function addNewProductCode(productId: string) {
  return sqlx.productCode.add.new(productId);
}
