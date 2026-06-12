import { sqlx } from "~/database/sqlx";

export function getAllUnsyncMoney() {
  return sqlx.money.get.allUnsync();
}
