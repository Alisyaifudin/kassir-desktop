import { Effect } from "effect";
import { store } from "~/store";
import { server } from "~/server";
import { mergePockets } from "./merge";
import { createSync, syncAdapter } from "../factory";
import { collectPockets, pushPockets } from "./push";
import { db } from "~/database/db";

export const method = createSync.many(
  Effect.gen(function* () {
    const { exist, deleted, timestamp } = yield* syncAdapter.many.pull({
      storeGet: () => store.sync.pocket.get(),
      serverGet: (token, ts, cb) => server.pocket.get(token, ts, cb),
    });
    yield* mergePockets(exist, deleted, timestamp, {
      getLocalPocket: (id) =>
        db.pocket.get
          .byId(id)
          .pipe(Effect.catchTag("NotFound", () => Effect.succeed(null))),
      upsertPocketOne: (pocket, now) => db.pocket.sync.upsert.one(pocket, now),
      getLocalMoneyUpdatedAt: (ids) => db.money.get.updatedAt(ids),
      upsertMoneyMany: (pocketId, money, now) =>
        db.money.sync.upsert.many(pocketId, money, now),
      deletePocketMany: (ids, now) => db.pocket.sync.delete.many(ids, now),
      deleteMoneyMany: (ids, now) => db.money.sync.delete.many(ids, now),
      storeSet: (now) => store.sync.pocket.set(now),
    });
    yield* pushPockets({
      allUnsync: () => collectPockets(),
      upload: (token, payload, cb) => server.pocket.post(token, payload, cb),
      markUpdatedAt: (ids, ts) => db.pocket.sync.update.many.updatedAt(ids, ts),
    });
  }),
);
