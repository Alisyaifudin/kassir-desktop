import { Effect } from "effect";
import { db } from "~/database";
import { MethodServer } from "~/server/method/get";

export function merge(methods: MethodServer[]) {
  return Effect.gen(function* () {
    if (methods.length === 0) return Date.now();
    const methodMap = yield* db.method.get.updated(methods.map((p) => p.id));
    const addMethods: MethodServer[] = [];
    const updateMethods: MethodServer[] = [];
    let latestUpdatedAt = 0;
    for (const method of methods) {
      const methodUpdatedAt = method.updatedAt ?? 0;
      if (latestUpdatedAt < methodUpdatedAt) {
        latestUpdatedAt = methodUpdatedAt;
      }
      const localUpdatedAt = methodMap.get(method.id);
      if (localUpdatedAt === undefined) {
        addMethods.push(method);
      } else if (localUpdatedAt < methodUpdatedAt) {
        updateMethods.push(method);
      }
    }
    yield* Effect.all([insert(addMethods), update(updateMethods)], { concurrency: "unbounded" });
    return latestUpdatedAt;
  });
}

function insert(methods: MethodServer[]) {
  return Effect.all(
    methods.map((method) =>
      db.method.add.sync({ ...method, name: method.name ?? undefined, deletedAt: method.deletedAt ?? null }).pipe(
        Effect.as(null),
        Effect.catchAll((e) =>
          Effect.succeed({
            error: e,
            id: method.id,
          }),
        ),
      ),
    ),
    { concurrency: 10 },
  );
}

function update(methods: MethodServer[]) {
  return Effect.all(
    methods.map((method) =>
      db.method.update.syncFromServer({ ...method, name: method.name ?? undefined, deletedAt: method.deletedAt ?? null }).pipe(
        Effect.as(null),
        Effect.catchAll((e) =>
          Effect.succeed({
            error: e,
            id: method.id,
          }),
        ),
      ),
    ),
    { concurrency: 10 },
  );
}
