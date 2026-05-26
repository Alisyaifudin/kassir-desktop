import { Effect } from "effect";
import { db } from "~/database";
import { server } from "~/server";
import { store } from "~/store";

export function pull(token: string) {
  return Effect.gen(function* () {
    const products = yield* db.product.get.all();
    const ids = products.map((p) => p.id);
    const timestamp = yield* store.sync.productEvent.get();
    console.log(
      `[pe:pull] ts=${timestamp} productCount=${products.length} ids_sample=${ids.slice(0, 3).join(",") || "none"}`,
    );
    const [{ data: totalRes }, { data: events }] = yield* Effect.all(
      [server.productEvent.count(timestamp, token), server.productEvent.get(ids, token, timestamp)],
      { concurrency: "unbounded" },
    );
    console.log(
      `[pe:pull] OK count=${totalRes.count} events=${events.length} first=${JSON.stringify(events[0]?.id ?? "none")}`,
    );
    return { items: events, total: totalRes.count };
  });
}
