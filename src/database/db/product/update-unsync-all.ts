import { sqlx } from "~/database/sqlx";

export function updateUnsyncAllProducts() {
  return sqlx.product.update.allUnsync();
}
