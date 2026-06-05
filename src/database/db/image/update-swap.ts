import { Effect } from "effect";
import { updateCache } from "./cache";
import { InvalidOperation } from "~/lib/effect-error";
import { produce } from "immer";
import { sqlx } from "~/database/sqlx";

export function updateSwapImage(imageAId: string, imageBId: string) {
  const now = Date.now();
  return Effect.gen(function* () {
    const [resA, resB] = yield* Effect.all(
      [sqlx.image.get.order(imageAId), sqlx.image.get.order(imageBId)],
      { concurrency: "unbounded" },
    );
    if (resA.productId !== resB.productId)
      return yield* InvalidOperation.fail(
        "Gambar yang ingin ditukar posisinya harus dari gambar yang sama",
      );
    const imageA = {
      id: imageAId,
      order: resA.order,
    };
    const imageB = {
      id: imageBId,
      order: resB.order,
    };
    const productId = resA.productId;
    yield* sqlx.image.update.swap(imageA, imageB, now);
    updateCache(
      productId,
      produce((draft) => {
        const idxA = draft.findIndex((d) => d.id === imageAId);
        const idxB = draft.findIndex((d) => d.id === imageBId);
        if (idxA === -1 || idxB === -1) return;
        draft[idxA].order = imageB.order;
        draft[idxB].order = imageA.order;
      }),
    );
  });
}
