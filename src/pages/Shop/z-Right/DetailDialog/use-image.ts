import { Effect } from "effect";
import { db } from "~/database";
import { image } from "~/lib/image";
import { log } from "~/lib/log";
import { Result } from "~/lib/result";

export function useImage(productId: string) {
  const res = Result.use({
    fn: () => program(productId),
    key: `product-detail-${productId}`,
  });
  return res;
}

function program(productId: string) {
  return Effect.gen(function* () {
    const res = yield* db.image.get.byProductId(productId);
    const urls = yield* Effect.all(
      res.map((r) => image.load(r.id, r.mime)),
      { concurrency: 5 },
    );
    return urls;
  }).pipe(
    Effect.catchTag("DbError", ({ e }) => {
      log.error(e);
      return Effect.fail(e.message);
    }),
    Effect.catchTag("IOError", ({ e }) => {
      log.error(e);
      return Effect.fail(e.message);
    }),
  );
}
