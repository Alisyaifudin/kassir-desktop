import { server } from "~/server";
import { db } from "~/database/db";
import { makePush } from "../util";

export const push = makePush({
  allUnsync: () => db.method.get.allUnsync(),
  upload: (token, payload, cb) => server.method.post(token, payload, cb),
  markSynced: (ids, ts) => db.method.sync.update.many.syncAt(ids, ts),
});
