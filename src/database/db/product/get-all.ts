import { sqlx } from "~/database/sqlx";
import { Effect } from "effect";
import { mapRowsToProducts } from "./util";
import { cache } from "./cache";

export function getAllProducts() {
  return sqlx.product.get.all().pipe(
    Effect.map(mapRowsToProducts),
    Effect.tap((products) => {
      cache.set(products);
    }),
  );
}
