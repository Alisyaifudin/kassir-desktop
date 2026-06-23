import { sqlx } from "~/database/sqlx";
import { Effect } from "effect";
import { NotFound } from "~/lib/effect-error";
import { mapRowsToProduct } from "./util";

export function getProductById(id: string) {
  return sqlx.product.get.byId(id).pipe(
    Effect.flatMap((r) =>
      r.length === 0 ? NotFound.fail("Produk tidak ditemukan") : Effect.succeed(r),
    ),
    Effect.map(mapRowsToProduct),
  );
}
