import { Effect } from "effect";
import { db } from "~/database";
import { log } from "~/lib/log";
import { server } from "~/server";

export function push(token: string, upto: number) {
  return Effect.gen(function* () {
    const methods = yield* db.method.get.unsync();
    if (methods.length === 0) return 0;
    const { data } = yield* server.method.post(methods, token);
    const { timestamp, failed } = data;
    const failedSet = new Set(failed);
    const syncIds = methods.flatMap((p) => (failedSet.has(p.id) ? [] : [p.id]));
    if (syncIds.length > 0) {
      yield* Effect.all(
        syncIds.map((id) =>
          db.method.update.sync(id).pipe(
            Effect.tapError((e) => {
              log.error(`Error: ${id}: ${e.e.message}`);
              return Effect.fail(e);
            }),
          ),
        ),
        { concurrency: 50 },
      );
    }
    const unsyncCount = (yield* db.method.get.unsync()).length;
    return unsyncCount;
  });
}
