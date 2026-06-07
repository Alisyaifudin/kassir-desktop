import { sqlx } from "~/database/sqlx";

export function addNewMoney(value: number, pocketId: string, note: string) {
  return sqlx.money.add.new(value, pocketId, note);
}
