import { store } from "~/store";
import { server } from "~/server";
import { db } from "~/database/db";
import { createSync, syncAdapter } from "./factory";
import { Effect } from "effect";

export const social = createSync.many(
  Effect.gen(function* () {
    const items = yield* syncAdapter.many.pull({
      storeGet: () => store.sync.social.get(),
      serverGet: (token, ts, cb) => server.social.get(token, ts, cb),
    });
    yield* syncAdapter.many.merge(items, {
      localUpdatedAt: (ids) => db.social.get.updatedAt(ids),
      deleteMany: (deleted, ts) =>
        db.social.delete.sync(
          deleted.map((d) => d.id),
          ts,
        ),
      upsertMany: (items, ts) => db.social.upsert.many(items, ts),
      storeSet: (ts) => store.sync.social.set(ts),
    });
    yield* syncAdapter.many.push({
      allUnsync: () => db.social.get.allUnsync(),
      upload: (token, payload, cb) => server.social.post(token, payload, cb),
      markSynced: (ids, ts) => db.social.sync.update.many.syncAt(ids, ts),
    });
  }),
);
