import { sqlx } from "~/database/sqlx";

export function deleteManyMoneySync(ids: string[], now: number) {
  return sqlx.money.sync.delete.many(ids, now);
}
