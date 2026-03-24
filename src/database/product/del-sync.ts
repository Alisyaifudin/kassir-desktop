import { DB } from "../instance";
import { Effect, pipe } from "effect";
import { cache } from "./cache";

export function delSync(id: string) {
  return pipe(
    DB.try((db) =>
      db.execute(
        `DELETE FROM products WHERE product_id = $1;
         DELETE FROM graves grave_item_id = $1;`,
        [id],
      ),
    ),
    Effect.tap(() => {
      cache.delete(id);
    }),
    Effect.asVoid,
  );
}
