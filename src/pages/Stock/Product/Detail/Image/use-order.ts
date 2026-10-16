import { useCallback, useEffect, useState } from "react";
import { Effect } from "effect";
import { db } from "~/database";
import { log } from "~/lib/log";
import { useId } from "../use-id";
import { ImageResult } from "./use-data";

/**
 * The order the thumbnails are dragged into.
 *
 * `images` comes from a cached query that knows nothing about a drag, so the order
 * the user chose is held here and handed to `Reorder.Group` as its values. A change
 * to the query itself - an add, a delete - takes over again.
 */
export function useOrder(images: ImageResult[]) {
  const productId = useId();
  const [order, setOrder] = useState(images);

  useEffect(() => {
    setOrder(images);
  }, [images]);

  const move = useCallback(
    (next: ImageResult[]) => {
      setOrder(next);
      // the new order is already on screen, so the write is left to finish on its
      // own and only a failure is reported: there is nothing better to show than
      // the order the user just dropped.
      Effect.runPromise(
        db.image.update.reorder(
          productId,
          next.map((image) => image.id),
        ),
      ).catch((error: unknown) => {
        log.error(error instanceof Error ? error : String(error));
      });
    },
    [productId],
  );

  return [order, move] as const;
}
