import { sqlx } from "~/database/sqlx";

export function updateCapital(entry: { id: string; capital: number; stock: number }) {
  return sqlx.capital.update.one(entry);
}
