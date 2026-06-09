import { Effect } from "effect";
import { store } from "~/store";
import { server } from "~/server";

export function pull(
  token: string,
  downloadCount: (currentSize: number, totalSize: number) => void,
) {
  return Effect.gen(function* () {
    const lastPullAt = yield* store.sync.method.get();
    const pulledData = yield* server.method.get(token, lastPullAt, downloadCount);
    return pulledData;
  });
}
