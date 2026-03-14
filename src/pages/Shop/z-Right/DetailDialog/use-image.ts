import { Effect } from "effect";
import { db } from "~/database";
import { image } from "~/lib/image-effect";
import { log } from "~/lib/log";
import { Result } from "~/lib/result";

export function useImage(productId: number) {
  const res = Result.use({
    fn: () => program(productId),
    key: `product-detail-${productId}`,
    revalidateOn: {
      unmount: true,
    },
  });
  return res;
}

function program(productId: number) {
  return Effect.gen(function* () {
    const res = yield* db.image.get.byProductId(productId);
    const urls = yield* Effect.all(
      res.map((r) => image.load(r.name, r.mime)),
      { concurrency: 5 },
    );
    return urls;
  }).pipe(
    Effect.catchTag("DbError", ({ e }) => {
      log.error(e);
      return Effect.fail(e.message);
    }),
    Effect.catchTag("IOError", ({ error }) => {
      log.error(error);
      return Effect.fail(error.message);
    }),
  );
}
