import { Effect } from "effect";
import { DB } from "../instance";
import { NotFound } from "~/lib/effect-error";

export function getImageOrder(imageId: string) {
  return Effect.gen(function* () {
    const images = yield* DB.select<{ image_order: number; product_id: string }[]>(
        "SELECT image_order, product_id FROM images WHERE image_id = $1",
        [imageId],
    );
    if (images.length === 0) return yield* NotFound.fail("Gambar tidak ditemukan");
    return { order: images[0].image_order, productId: images[0].product_id };
  });
}
