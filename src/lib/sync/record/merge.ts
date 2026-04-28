import { Effect } from "effect";
import { db } from "~/database";
import { RecordServer } from "~/server/record/get";

export function merge(records: RecordServer[]) {
  return Effect.gen(function* () {
    if (records.length === 0) return Date.now();
    const recordMap = yield* db.record.get.updated(records.map((p) => p.id));
    const addRecords: RecordServer[] = [];
    const updateRecords: RecordServer[] = [];
    let latestUpdatedAt = 0;
    for (const record of records) {
      if (latestUpdatedAt < record.updatedAt) {
        latestUpdatedAt = record.updatedAt;
      }
      const updatedAt = recordMap.get(record.id);
      if (updatedAt === undefined) {
        addRecords.push(record);
      } else if (updatedAt < record.updatedAt) {
        updateRecords.push(record);
      }
    }
    yield* Effect.all([insert(addRecords), update(updateRecords)], { concurrency: "unbounded" });
    return latestUpdatedAt;
  });
}

function insert(records: RecordServer[]) {
  return Effect.all(
    records.map((record) =>
      db.record.add.sync(record).pipe(
        Effect.as(null),
        Effect.catchAll((e) =>
          Effect.succeed({
            error: e,
            id: record.id,
          }),
        ),
      ),
    ),
    { concurrency: 10 },
  ).pipe(Effect.map((res) => res.filter((r) => r !== null)));
}

function update(products: RecordServer[]) {
  return Effect.all(
    products.map((product) =>
      db.record.update.sync(product).pipe(
        Effect.as(null),
        Effect.catchAll((e) =>
          Effect.succeed({
            error: e,
            id: product.id,
          }),
        ),
      ),
    ),
    { concurrency: 10 },
  ).pipe(Effect.map((res) => res.filter((r) => r !== null)));
}
