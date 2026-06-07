import { sqlx } from "~/database/sqlx";

export function updateMoneyNote(id: string, note: string, now: number) {
  return sqlx.money.update.note(id, note, now);
}
