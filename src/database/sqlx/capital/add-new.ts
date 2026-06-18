import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";

export function addNewCapital({
  capital,
  productId,
  stock,
}: {
  capital: number;
  productId: string;
  stock: number;
}) {
  const id = generateId();
  const now = Date.now();
  return DB.execute(
    `INSERT INTO capitals (capital_id, capital_capital, capital_stock, 
    capital_updated_at, product_id) VALUES ($1, $2, $3, $4, $5)`,
    [id, capital, stock, now, productId],
  ).pipe(Effect.as(id));
}
