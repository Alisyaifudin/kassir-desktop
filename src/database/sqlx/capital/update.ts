import { DB } from "../instance";
import { Effect } from "effect";

export function updateCapital(
  {
    id,
    capital, 
    stock
  }: {
    id: string;
    capital: number;
    stock: number;
  },
) {
  const now = Date.now()
  return DB.execute(
    `UPDATE capitals SET capital_capital = $1, capital_stock = $2,
    capital_updated_at = $3, capital_sync_at = null WHERE capital_id = $4`,
    [capital, stock, now, id],
  ).pipe(Effect.asVoid);
}
