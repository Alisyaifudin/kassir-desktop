import { sqlx } from "~/database/sqlx";

export function deleteManyMoneySync(money: { id: string; deletedAt: number }[], now: number) {
  return sqlx.money.sync.delete.many(money, now);
}
