import { sqlx } from "~/database/sqlx";

export function addManyMoneyExternal(
  pocketId: string,
  money: {
    value: number;
    note: string;
    timestamp: number;
  }[],
) {
  return sqlx.money.add.external(pocketId, money);
}
