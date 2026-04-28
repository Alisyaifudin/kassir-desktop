import { Effect } from "effect";
import { db } from "~/database";
import { log } from "~/lib/log";
import { server } from "~/server";
import { RecordServer } from "~/server/record/get";

export function push(token: string, upto: number) {
  return Effect.gen(function* () {
    const records = yield* getRecords(upto)
    if (records.length === 0) return 0;
    const { data } = yield* server.record.post(records, token);
    const { timestamp, failed } = data;
    const failedSet = new Set(failed);
    const syncIds = records.flatMap((p) => (failedSet.has(p.id) ? [] : [p.id]));
    if (syncIds.length > 0) {
      yield* Effect.all(
        syncIds.map((id) =>
          db.record.update.syncAt(id, timestamp).pipe(
            Effect.tapError((e) => {
              log.error(`Error: ${id}: ${e.e.message}`);
              return Effect.fail(e);
            }),
          ),
        ),
        { concurrency: 50 },
      );
    }
    const unsyncCount = yield* db.record.count.unsync();
    return unsyncCount;
  });
}

function getRecords(before: number) {
  return Effect.gen(function* () {
    const recordsRaw = yield* db.record.get.unsync(before);
    const ids = recordsRaw.map((r) => r.id);
    const [products, extras] = yield* Effect.all(
      [db.recordProduct.get.byRecordIds(ids), db.recordExtra.get.byRecordIds(ids)],
      { concurrency: "unbounded" },
    );
    const records = recordsRaw.map((r) => {
      const ps = products.filter((p) => p.recordId === r.id);
      const es = extras.filter((p) => p.recordId === r.id);
      const record: RecordServer = {
        ...r,
        products: ps,
        extras: es,
      };
      return record;
    });

    return records;
  });
}
