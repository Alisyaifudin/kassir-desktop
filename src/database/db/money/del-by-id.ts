import { sqlx } from "~/database/sqlx";

export function deleteMoneyById(id: string) {
  return sqlx.money.delete.byId(id);
}
