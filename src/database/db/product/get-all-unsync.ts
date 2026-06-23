import { sqlx } from "~/database/sqlx";
import { Effect } from "effect";
import { mapRowsToProducts } from "./util";

export function getAllUnsyncProducts() {
  return sqlx.product.get.allUnsync().pipe(
    Effect.map(mapRowsToProducts),
  );
}
