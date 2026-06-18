import { sqlx } from "~/database/sqlx";

export function deleteManyProductCodes(productId: string, codes: string[], now: number) {
  return sqlx.productCode.delete.many(productId, codes, now);
}
