import { store } from "~/store";
import { server } from "~/server";
import { db } from "~/database/db";
import { SyncMany } from "./factory-many";
import { simpleMerge } from "./util";

export const method = SyncMany.pull({
  storeGet: () => store.sync.method.get(),
  serverGet: (token, ts, cb) => server.method.get(token, ts, cb),
})
  .merge(
    simpleMerge({
      localUpdatedAt: (ids) => db.method.get.updatedAt(ids),
      deleteMany: (deleted, ts) => db.method.sync.delete.many(deleted, ts),
      upsertMany: (items, ts) => db.method.sync.upsert.many(items, ts),
      storeSet: (ts) => store.sync.method.set(ts),
    }),
  )
  .push({
    allUnsync: () => db.method.get.allUnsync(),
    upload: (token, payload, cb) => server.method.post(token, payload, cb),
    markSynced: (ids, ts) => db.method.sync.update.many.syncAt(ids, ts),
  })
  .build();
