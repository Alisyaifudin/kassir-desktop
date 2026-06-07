import { sqlx } from "~/database/sqlx";

export function updateManyMoneySyncAt(ids: string[], now: number) {
  return sqlx.money.sync.update.many.syncAt(ids, now);
}
