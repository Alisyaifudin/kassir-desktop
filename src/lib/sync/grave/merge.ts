import { Effect } from "effect";
import { db } from "~/database";
import { GraveServer } from "~/server/grave/get";

export function merge(grave: GraveServer) {
  return Effect.gen(function* () {
    const allIds = [...grave.products, ...grave.records];
    if (allIds.length === 0) return;
    // Delete products (no grave creation — server already knows)
    yield* Effect.all(
      grave.products.map((id) =>
        db.product.del.sync(id).pipe(
          Effect.catchAll(() => Effect.succeed(undefined)),
        ),
      ),
      { concurrency: 10 },
    );
    // Delete records (no grave creation — server already knows)
    yield* Effect.all(
      grave.records.map((id) =>
        db.record.del.sync(id).pipe(
          Effect.catchAll(() => Effect.succeed(undefined)),
        ),
      ),
      { concurrency: 10 },
    );
    // Clean up any local grave entries for these IDs
    yield* db.grave.del.byItemIds(allIds).pipe(
      Effect.catchAll(() => Effect.succeed(undefined)),
    );
  });
}
