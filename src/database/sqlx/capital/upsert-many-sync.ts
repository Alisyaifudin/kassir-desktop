import { DB } from "../instance";
import { Effect } from "effect";

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
  let bindingIndex = 1;
  const placeholders = capitals
    .map(
      () =>
        `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
        $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
        $${bindingIndex++})`,
    )
    .join(", ");
  const bindings = capitals.flatMap(({ id, stock, capital, productId, updatedAt }) => [
    id,
    stock,
    capital,
    updatedAt,
    now,
    null,
    productId,
  ]);
  return DB.execute(
    `INSERT INTO capitals (capital_id, capital_stock, capital_capital,
    capital_updated_at, capital_sync_at, capital_deleted_at, product_id)
    VALUES ${placeholders} ON CONFLICT (capital_id) DO UPDATE SET 
    capital_stock = excluded.capital_stock,
    capital_capital = excluded.capital_capital,
    capital_updated_at = excluded.capital_updated_at,
    capital_sync_at = excluded.capital_sync_at,
    capital_deleted_at = excluded.capital_deleted_at,
    product_id = excluded.product_id
    `,
    bindings,
  ).pipe(Effect.as(capitals.map((extra) => extra.id)));
}
