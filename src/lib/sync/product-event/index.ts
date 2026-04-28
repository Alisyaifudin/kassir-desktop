import { Effect } from "effect";
import { pull } from "./pull";
import { merge } from "./merge";
import { push } from "./push";
import { log } from "~/lib/log";
import { responseError } from "~/lib/response";
import { z } from "zod";
import { store } from "~/store";

export function productEvent(
  token: string,
  stop: {
    pull: boolean;
    push: boolean;
  },
) {
  return Effect.gen(function* () {
    let upto = Date.now();
    let serverCount = 0;
    let total = 0;
    if (!stop.pull) {
      const { items: events, total: t } = yield* pull(token);
      upto = yield* merge(events);
      serverCount = events.length;
      total = t;
    }
    let unsyncCount = 0;

    if (!stop.push || !stop.pull) {
      unsyncCount = yield* push(token, upto);
    }
    yield* store.sync.productEvent.set(upto);
    return { unsync: unsyncCount, server: serverCount, total };
  }).pipe(
    Effect.catchAll((e) => {
      switch (e._tag) {
        case "NotFound":
          return Effect.fail("Produk tidak ditemukan");
        case "BodyError":
        case "RequestError":
          log.error(e.error);
          return Effect.fail("Tidak bisa menghubugi server");
        case "DbError":
        case "StoreError":
          log.error(e.e);
          return Effect.fail(e.e.message);
        case "ResponseError":
          return responseError.failMsg(e);
        case "ZodSchemaError": {
          const error = z.treeifyError(e.error);
          console.error(error);
          log.error(JSON.stringify(error.errors));
          return Effect.fail("Data tidak valid");
        }
      }
    }),
  );
}
