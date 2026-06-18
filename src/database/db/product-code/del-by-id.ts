import { sqlx } from "~/database/sqlx";

export function deleteProductCodeByCode(productId: string, code: string, now: number) {
  return sqlx.productCode.delete.byCode(productId, code, now);
}
