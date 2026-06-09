import { db } from "~/database/db";
import { store } from "~/store";
import type { MethodServer } from "~/server/method/get";
import { makeMerge } from "../util";

export const merge = makeMerge<MethodServer>()({
  localUpdatedAt: (ids) => db.method.get.updatedAt(ids),
  deleteMany: (deleted, ts) => db.method.sync.delete.many(deleted, ts),
  upsertMany: (items, ts) => db.method.sync.upsert.many(items, ts),
  storeSet: (ts) => store.sync.method.set(ts),
});
