import { Effect } from "effect";
import { db } from "~/database";
import { ProductEventServer } from "~/server/product-event/get";

export function merge(productId: string, events: ProductEventServer[]) {
  return Effect.gen(function* () {
    if (events.length === 0) return;
    yield* db.productEvent.set.sync(productId, events);
  });
}
