import { Effect } from "effect";
import { server } from "~/server";
import { store } from "~/store";

export function pull(token: string) {
  return Effect.gen(function* () {
    const timestamp = yield* store.sync.grave.get();
    const [{ data: totalRes }, { data }] = yield* Effect.all(
      [server.grave.count(timestamp, token), server.grave.get(timestamp, token)],
      { concurrency: "unbounded" },
    );
    return { items: data, total: totalRes.products + totalRes.records };
  });
}
