import { Effect } from "effect";
import { TX } from "../instance";

type Data = {
  productId: string;
  id: string;
};

export function add({ id, productId }: Data) {
  return TX.try((tx) =>
    tx.execute(
      `INSERT INTO discounts (disc_id, product_id) 
         VALUES ($1, $2)`,
      [id, productId],
    ),
  ).pipe(Effect.asVoid);
}
