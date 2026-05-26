import { Effect } from "effect";
import { db } from "~/database";
import { ProductEventServer } from "~/server/product-event/get";

export function merge(events: ProductEventServer[]) {
  return Effect.gen(function* () {
    console.log(`[pe:merge] events=${events.length}`);
    if (events.length === 0) return Date.now();
    const latest = Math.max(...events.map((e) => e.createdAt));
    console.log(`[pe:merge] latest=${latest} ids=${events.slice(0, 5).map((e) => e.id + "/" + e.productId).join(", ")}`);
    yield* db.productEvent.update.sync(events);
    console.log(`[pe:merge] db sync done`);
    return latest;
  });
}
