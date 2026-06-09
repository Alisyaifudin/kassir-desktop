import { Effect } from "effect";
import { makeMerge, makePull, makePush } from "./util";
import { store } from "~/store";
import { server } from "~/server";
import { db } from "~/database/db";
import { CustomerServer } from "~/server/customer/get";

const pull = makePull({
  storeGet: () => store.sync.customer.get(),
  serverGet: (token, ts, cb) => server.customer.get(token, ts, cb),
});

const merge = makeMerge<CustomerServer>()({
  localUpdatedAt: (ids) => db.customer.get.updatedAt(ids),
  deleteMany: (deleted, ts) => db.customer.sync.delete.many(deleted, ts),
  upsertMany: (items, ts) => db.customer.sync.upsert.many(items, ts),
  storeSet: (ts) => store.sync.customer.set(ts),
});

const push = makePush({
  allUnsync: () => db.customer.get.allUnsync(),
  upload: (token, payload, cb) => server.customer.post(token, payload, cb),
  markSynced: (ids, ts) => db.customer.sync.update.many.syncAt(ids, ts),
});

export function customer(
  token: string,
  cb: {
    uploadCount: (currentSize: number, totalSize: number) => void;
    downloadCount: (currentSize: number, totalSize: number) => void;
  },
) {
  return Effect.gen(function* () {
    const pulledData = yield* pull(token, cb.downloadCount);
    yield* merge(pulledData);
    yield* push(token, cb.uploadCount);
  });
}
