import { sqlx } from "~/database/sqlx";

export function getAllUnsyncMoney(timestamp: number) {
  return sqlx.money.get.allUnsync(timestamp);
}
