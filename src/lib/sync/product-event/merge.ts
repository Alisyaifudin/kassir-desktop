import { Effect } from "effect";
import { db } from "~/database";
import { ProductEventServer } from "~/server/product-event/get";

export function merge(events: ProductEventServer[]) {
  return Effect.gen(function* () {
    if (events.length === 0) return Date.now();
    const latest = Math.max(...events.map((e) => e.createdAt));
    yield* db.productEvent.update.sync(events);
    return latest;
  });
}
