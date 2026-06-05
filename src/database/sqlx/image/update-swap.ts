import { Effect } from "effect";
import { DB } from "../instance";

export function updateSwapImageOrder(
  imageA: {
    order: number;
    id: string;
  },
  imageB: {
    order: number;
    id: string;
  },
  now: number,
) {
  return Effect.gen(function* () {
    yield* DB.execute(
      `BEGIN TRANSACTION;
      UPDATE images SET image_sync_at = null, image_updated_at = $1, image_order = $2 WHERE image_id = $3;
      UPDATE images SET image_sync_at = null, image_updated_at = $4, image_order = $5 WHERE image_id = $6;
      COMMIT;`,
      [now, imageB.order, imageA.id, now, imageA.order, imageB.id],
    );
  });
}
