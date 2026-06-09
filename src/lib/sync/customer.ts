import { store } from "~/store";
import { server } from "~/server";
import { db } from "~/database/db";
import { Sync } from "./factory";

export const customer = Sync.pull({
  storeGet: () => store.sync.customer.get(),
  serverGet: (token, ts, cb) => server.customer.get(token, ts, cb),
})
  .merge({
    localUpdatedAt: (ids) => db.customer.get.updatedAt(ids),
    deleteMany: (deleted, ts) => db.customer.sync.delete.many(deleted, ts),
    upsertMany: (items, ts) => db.customer.sync.upsert.many(items, ts),
    storeSet: (ts) => store.sync.customer.set(ts),
  })
  .push({
    allUnsync: () => db.customer.get.allUnsync(),
    upload: (token, payload, cb) => server.customer.post(token, payload, cb),
    markSynced: (ids, ts) => db.customer.sync.update.many.syncAt(ids, ts),
  });
