import { Effect } from "effect";
import { db } from "~/database";
import { log } from "~/lib/log";
import { server } from "~/server";
import { store } from "~/store";

const CHUNK_SIZE = 100;

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function pushAll(token: string) {
  return Effect.gen(function* () {
    const lastPullAt = yield* store.sync.productEvent.pullAt.get();
    const events = yield* db.productEvent.get.unsync(lastPullAt);
    if (events.length === 0) return 0;

    const chunks = chunk(events, CHUNK_SIZE);
    const allFailed: string[] = [];
    let lastTimestamp = 0;

    for (const batch of chunks) {
      const { data } = yield* server.productEvent.post(batch, token);
      lastTimestamp = data.timestamp;
      allFailed.push(...data.failedIds);
    }

    const failedSet = new Set(allFailed);
    const syncIds = events.flatMap((p) => (failedSet.has(p.id) ? [] : [p.id]));

    if (syncIds.length > 0) {
      yield* Effect.all(
        syncIds.map((id) =>
          db.productEvent.update.syncAt(id, lastTimestamp).pipe(
            Effect.tapError((e) => {
              log.error(`Error: ${id}: ${e.e.message}`);
              return Effect.fail(e);
            }),
          ),
        ),
        { concurrency: 50 },
      );
    }

    yield* store.sync.productEvent.pushAt.set(Date.now());
    return yield* db.productEvent.get.countUnsync();
  });
}
