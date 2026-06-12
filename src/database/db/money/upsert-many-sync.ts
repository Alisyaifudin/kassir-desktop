import { sqlx } from "~/database/sqlx";

export function upsertManyMoneySync(
  pocketId: string,
  money: {
    id: string;
    note: string;
    value: number;
    timestamp: number;
    updatedAt: number;
  }[],
  now: number,
) {
  return sqlx.money.sync.upsert.many(pocketId, money, now);
}
