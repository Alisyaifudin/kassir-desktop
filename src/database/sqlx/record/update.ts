import { DB } from "../instance";
import { Effect } from "effect";

export function updateProduct(
  {
    id,
    name,
    price,
    note,
  }: {
    id: string;
    name: string;
    price: number;
    note: string;
  },
  now: number,
) {
  return DB.execute(
    `UPDATE products SET product_name = $1, product_price = $2, 
    product_note = $3, product_sync_at = null, product_updated_at = $4
    WHERE product_id = $5`,
    [name, price, note, now, id],
  ).pipe(Effect.asVoid);
}
