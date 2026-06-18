import { sqlx } from "~/database/sqlx";

export function upsertManyCapitalsSync(
  capitals: {
    id: string;
    productId: string;
    stock: string;
    capital: string;
    updatedAt: number;
  }[],
  now: number,
) {
  return sqlx.capital.sync.upsert.many(capitals, now);
}
