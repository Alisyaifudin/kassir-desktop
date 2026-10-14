import { useEffect, useState } from "react";
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

const cache = new Map<string, ProductCover | null>();

/**
 * Resolves the cover (first by image_order) of a product so `LazyImage` can stay
 * a dumb file loader. Repeat lookups are synchronous, and the per-product image
 * cache in `~/database/image/cache` keeps the query itself cheap.
 */
export function useProductCover(productId: string) {
  const [cover, setCover] = useState<CoverState>(() => cache.get(productId));

  useEffect(() => {
    const cached = cache.get(productId);
    if (cached !== undefined) {
      setCover(cached);
      return;
    }
    let alive = true;
    setCover(undefined);
    Effect.runPromise(db.image.get.byProductId(productId))
      .then((images) => {
        const first = images.at(0);
        const value: ProductCover | null =
          first === undefined ? null : { file: first.name, mime: first.mime };
        cache.set(productId, value);
        if (alive) setCover(value);
      })
      .catch((error: unknown) => {
        log.error(error instanceof Error ? error : String(error));
        cache.set(productId, null);
        if (alive) setCover(null);
      });
    return () => {
      alive = false;
    };
  }, [productId]);

  return cover;
}
