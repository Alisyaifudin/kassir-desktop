import { sqlx } from "~/database/sqlx";

export function updateUnsyncAllMoney() {
  return sqlx.money.update.unsyncAll();
}
