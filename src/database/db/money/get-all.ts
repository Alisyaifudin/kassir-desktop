import { sqlx } from "~/database/sqlx";

export function getAllMoney(pocketId: string) {
  return sqlx.money.get.all(pocketId);
}
