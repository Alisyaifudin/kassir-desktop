import { store } from "~/store";
import { server } from "~/server";
import { db } from "~/database/db";
import { createSync, syncAdapter } from "./factory";
import { Effect } from "effect";

export const customer = createSync.many(
  Effect.gen(function* () {
    const items = yield* syncAdapter.many.pull({
      storeGet: () => store.sync.customer.get(),
      serverGet: (token, timestamp, cb) => server.customer.get(token, timestamp, cb),
    });
    yield* syncAdapter.many.merge(items, {
      localUpdatedAt: (ids) => db.customer.get.updatedAt(ids),
      deleteMany: (deleted, timestamp) => db.customer.sync.delete.many(deleted, timestamp),
      upsertMany: (items, timestamp) => db.customer.sync.upsert.many(items, timestamp),
      storeSet: (timestamp) => store.sync.customer.set(timestamp),
    });
    yield* syncAdapter.many.push({
      allUnsync: () => db.customer.get.allUnsync(),
      upload: (token, payload, cb) => server.customer.post(token, payload, cb),
      markSynced: (ids, ts) => db.customer.sync.update.many.syncAt(ids, ts),
    });
  }),
);
