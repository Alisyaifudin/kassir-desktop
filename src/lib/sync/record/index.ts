import { Effect } from "effect";
import { pull } from "./pull";
import { merge } from "./merge";
import { push } from "./push";
import { store } from "~/store";
import { log } from "~/lib/log";
import { responseError } from "~/lib/response";

export function record(
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
      const { items: records, total: t } = yield* pull(token);
      upto = yield* merge(records);
      serverCount = records.length;
      total = t;
    }
    let unsyncCount = 0;
    if (!stop.push || !stop.pull) {
      unsyncCount = yield* push(token, upto);
    }
    yield* store.sync.record.set(upto);
    return { unsync: unsyncCount, server: serverCount, total };
  }).pipe(
    Effect.catchAll((e) => {
      switch (e._tag) {
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
          console.error("[record:sync] Zod validation failed, issues:", e.error.issues);
          const shown = e.error.issues.slice(0, 10).map((i) => {
            const path = i.path.join(".");
            return `${i.message} (at ${path || "root"})`;
          });
          log.error(JSON.stringify(e.error.issues));
          return Effect.fail(shown.join("; "));
        }
      }
    }),
  );
}
