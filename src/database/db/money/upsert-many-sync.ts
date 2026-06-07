import { sqlx } from "~/database/sqlx";

export function upsertManyMoneySync({
  money,
  now,
}: {
  money: {
    id: string;
    note: string;
    value: number;
    timestamp: number;
    pocketId: string;
    updatedAt: number;
  }[];
  now: number;
}) {
  return sqlx.money.sync.upsert.many({ money, now });
}
