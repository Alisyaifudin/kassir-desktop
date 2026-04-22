import { Effect } from "effect";
import { pull } from "./pull";
import { merge } from "./merge";
import { push } from "./push";
import { log } from "~/lib/log";
import { responseError } from "~/lib/response";
import { z } from "zod";

// todo: keep calling sync until unsync is zero

export function product(
  productId: string,
  token: string,
  stop: {
    pull: boolean;
    push: boolean;
  },
) {
  return Effect.gen(function* () {
    let serverCount = 0;
    if (!stop.pull) {
      const events = yield* pull(productId, token);
      yield* merge(productId, events);
      serverCount = events.length;
    }
    let unsyncCount = 0;
    if (!stop.push) {
      unsyncCount = yield* push(productId, token);
    }
    return { unsync: unsyncCount, server: serverCount };
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
          log.error(e.e);
          return Effect.fail(e.e.message);
        case "ResponseError":
          return responseError.failMsg(e);
        case "ZodSchemaError": {
          const error = z.treeifyError(e.error);
          log.error(JSON.stringify(error.errors));
          return Effect.fail(error.errors.join("; "));
        }
      }
    }),
  );
}
