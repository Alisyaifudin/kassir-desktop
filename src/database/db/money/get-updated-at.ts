import { sqlx } from "~/database/sqlx";

export function getMoneyUpdatedAt(ids: string[]) {
  return sqlx.money.get.updatedAt(ids);
}
