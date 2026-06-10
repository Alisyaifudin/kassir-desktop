import { Effect } from "effect";
import { server } from "~/server";
import { store } from "~/store";

export function pull(token: string) {
  return Effect.gen(function* () {
    const timestamp = yield* store.sync.record.get();
    const [{ data: totalRes }, { data }] = yield* Effect.all(
      [server.record.count(timestamp, token), server.record.get(timestamp, token)],
      { concurrency: "unbounded" },
    );
    return { items: data, total: totalRes.count };
  });
}
