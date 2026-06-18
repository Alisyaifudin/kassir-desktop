import { sqlx } from "~/database/sqlx";

export function updateManyProductsSyncAt(ids: string[], now: number) {
  return sqlx.product.sync.update.many.syncAt(ids, now);
}
