import { sqlx } from "~/database/sqlx";

export function updateProductCode(entry: { code: string; productId: string }, now: number) {
  return sqlx.productCode.update.one(entry, now);
}
