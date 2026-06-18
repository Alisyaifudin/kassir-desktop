import { Effect } from "effect";
import { DB } from "../instance";
import { NotFound } from "~/lib/effect-error";

export function getProductIdByCode(code: string) {
  return DB.select<{ product_id: string }[]>(
    `SELECT product_id FROM product_codes WHERE product_code = $1`,
    [code],
  ).pipe(
    Effect.flatMap((res) =>
      res.length === 0
        ? NotFound.fail("Produk tidak ditemukan")
        : Effect.succeed(res[0].product_id),
    ),
  );
}
