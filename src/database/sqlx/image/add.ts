import { generateId } from "~/lib/random";
import { DB } from "../instance";
import { Effect } from "effect";

export function addNewImage({
  name,
  mime,
  productId,
  maxOrder,
  now,
}: {
  name: string;
  mime: DB.Mime;
  productId: string;
  maxOrder: number;
  now: number;
}) {
  const id = generateId();
  return Effect.gen(function* () {
    yield* DB.execute(
      `INSERT INTO images (image_id, image_name, image_mime, image_order, product_id, 
         image_updated_at, image_sync_at) 
         VALUES ($1, $2, $3, $4, $5, $6, null)`,
      [id, name, mime, maxOrder + 1, productId, now],
    );
    return id;
  });
}
