import { store } from "~/store";
import { server } from "~/server";
import { db } from "~/database/db";
import { createSync, syncAdapter } from "./factory";
import { Effect } from "effect";

export const extra = createSync.many(
  Effect.gen(function* () {
    const items = yield* syncAdapter.many.pull({
      storeGet: () => store.sync.extra.get(),
      serverGet: (token, ts, cb) => server.extra.get(token, ts, cb),
    });
    yield* syncAdapter.many.merge(items, {
      localUpdatedAt: (ids) => db.extra.get.updatedAt(ids),
      deleteMany: (deleted, ts) => db.extra.sync.delete.many(deleted, ts),
      upsertMany: (items, ts) => db.extra.sync.upsert.many(items, ts),
      storeSet: (ts) => store.sync.extra.set(ts),
    });
    yield* syncAdapter.many.push({
      allUnsync: () => db.extra.get.allUnsync(),
      upload: (token, payload, cb) => server.extra.post(token, payload, cb),
      markSynced: (ids, ts) => db.extra.sync.update.many.syncAt(ids, ts),
    });
  }),
);
