import { sqlx } from "~/database/sqlx";

export function addNewCapital(entry: { capital: number; stock: number; productId: string }) {
  return sqlx.capital.add.new(entry);
}
