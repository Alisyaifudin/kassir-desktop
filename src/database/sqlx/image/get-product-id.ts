import { Effect } from "effect";
import { DB } from "../instance";
import { NotFound } from "~/lib/effect-error";

export function getProductIdByImageId(id: string) {
  return DB.select<{ product_id: string }[]>(`SELECT product_id FROM images WHERE image_id = $1`, [
    id,
  ]).pipe(
    Effect.flatMap((res) => {
      if (res.length === 0) return NotFound.fail("Produk gambar tidak ditemukan");
      return Effect.succeed(res[0].product_id);
    }),
  );
}
