import { useEffect, useSyncExternalStore } from "react";
import { Effect } from "effect";
import { db } from "~/database";
import { log } from "~/lib/log";

export type ProductCover = {
  /** key `image.load` expects: the image's `image_name`, not its `image_id` */
  file: string;
  mime: DB.Mime;
};

/** undefined = still resolving, null = product has no image. */
export type CoverState = ProductCover | null | undefined;

/**
 * Cover (first by `image_order`) of a product.
 *
 * The image rows are the cache - this reads them through the image store rather
 * than keeping a copy of the answer. A copy is what used to go stale: a product
 * whose images were read while it had none kept resolving to "no image" for the
 * rest of the session, so the card stayed on the placeholder after an upload.
 * `useSyncExternalStore` re-reads the cache whenever an image row is written.
 *
 * On a miss it starts the read and returns undefined; the store notifies when
 * the rows land, which re-runs the selector.
 */
export function useProductCover(productId: string): CoverState {
  const images = useSyncExternalStore(
    db.image.subscribe,
    () => db.image.get.cachedByProductId(productId),
  );

  useEffect(() => {
    if (images !== undefined) return;
    Effect.runPromise(db.image.get.byProductId(productId)).catch((error: unknown) => {
      log.error(error instanceof Error ? error : String(error));
    });
  }, [productId, images]);

  if (images === undefined) return undefined;
  // the cover is the row with the lowest `image_order`, which is the value the db
  // itself orders by - rather than trusting a position in the cached array to
  // mean that.
  let first = images[0];
  if (first === undefined) return null;
  for (const image of images) {
    if (image.order < first.order) first = image;
  }
  return { file: first.name, mime: first.mime };
}
