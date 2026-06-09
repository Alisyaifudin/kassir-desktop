import { Effect } from "effect";
import { MethodServer } from "~/server/method/get";
import { db } from "~/database/db";
import { store } from "~/store";

export function merge({
  exist,
  deleted,
  timestamp,
}: {
  exist: MethodServer[];
  deleted: {
    id: string;
    deletedAt: number;
  }[];
  timestamp: number;
}) {
  return Effect.gen(function* () {
    const methodsInDb = yield* db.method.get.updatedAt(exist.map((m) => m.id));

    const methods: {
      id: string;
      name?: string;
      kind: typeof exist[number]["kind"];
      updatedAt: number;
    }[] = [];

    for (const method of exist) {
      const localUpdatedAt = methodsInDb.get(method.id);
      if (localUpdatedAt === undefined) {
        methods.push({
          id: method.id,
          name: method.name ?? undefined,
          kind: method.kind,
          updatedAt: method.updatedAt ?? 0,
        });
      } else if (localUpdatedAt < (method.updatedAt ?? 0)) {
        methods.push({
          id: method.id,
          name: method.name ?? undefined,
          kind: method.kind,
          updatedAt: method.updatedAt ?? 0,
        });
      }
    }

    yield* db.method.sync.delete.many(deleted, timestamp);
    yield* db.method.sync.upsert.many(methods, timestamp);
    yield* store.sync.method.set(timestamp);
  });
}
