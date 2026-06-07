import { sqlx } from "~/database/sqlx";

export function getUnsyncMoneyAfter(timestamp: number) {
  return sqlx.money.get.unsync.after(timestamp);
}
