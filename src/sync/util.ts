import { Effect } from "effect";
import z from "zod";
import { SimpleResponseError, ZodSchemaError } from "~/lib/effect-error";
import { parseJson } from "~/lib/utils";
import type { UploadResponse } from "~/lib/stream";

type ProgressCb = (currentSize: number, totalSize: number) => void;

// ============================================================================
// makePull
// ============================================================================

export function makePull<T, E1 = never, E2 = never, R1 = never, R2 = never>(deps: {
  storeGet: () => Effect.Effect<number, E1, R1>;
  serverGet: (token: string, ts: number, cb: ProgressCb) => Effect.Effect<T, E2, R2>;
}) {
  return function pull(
    token: string,
    downloadCount: ProgressCb,
  ): Effect.Effect<T, E1 | E2, R1 | R2> {
    return Effect.gen(function* () {
      const lastPullAt = yield* deps.storeGet();
      return yield* deps.serverGet(token, lastPullAt, downloadCount);
    });
  };
}

// ============================================================================
// makeMerge
// ============================================================================

export function makeMerge<Exist extends { id: string; updatedAt: number }>() {
  return function buildMerge<
    Deleted extends { id: string; deletedAt: number },
    E1,
    E2,
    E3,
    E4,
    R1,
    R2,
    R3,
    R4,
  >(deps: {
    localUpdatedAt: (ids: string[]) => Effect.Effect<Map<string, number>, E1, R1>;
    deleteMany: (deleted: Deleted[], ts: number) => Effect.Effect<void, E2, R2>;
    upsertMany: (items: Exist[], ts: number) => Effect.Effect<void, E3, R3>;
    storeSet: (ts: number) => Effect.Effect<void, E4, R4>;
  }) {
    return function merge(data: {
      exist: Exist[];
      deleted: Deleted[];
      timestamp: number;
    }): Effect.Effect<void, E1 | E2 | E3 | E4, R1 | R2 | R3 | R4> {
      return Effect.gen(function* () {
        const local = yield* deps.localUpdatedAt(data.exist.map((e) => e.id));

        const toUpsert: Exist[] = [];
        for (const item of data.exist) {
          const localTs = local.get(item.id);
          if (localTs === undefined || localTs < item.updatedAt) {
            toUpsert.push(item);
          }
        }

        yield* deps.deleteMany(data.deleted, data.timestamp);
        yield* deps.upsertMany(toUpsert, data.timestamp);
        yield* deps.storeSet(data.timestamp);
      });
    };
  };
}

// ============================================================================
// makePush
// ============================================================================

const responseBodySchema = z.object({
  timestamp: z.number().min(0).max(1e16),
  failedIds: z.string().nonempty().max(100).array(),
});

export function makePush<
  Exist extends { id: string },
  Deleted extends { id: string; deletedAt: number },
  E1,
  E2,
  E3,
  R1,
  R2,
  R3,
>(deps: {
  allUnsync: () => Effect.Effect<{ exist: Exist[]; deleted: Deleted[] }, E1, R1>;
  upload: (
    token: string,
    payload: { exist: Exist[]; deleted: Deleted[] },
    cb: ProgressCb,
  ) => Effect.Effect<UploadResponse, E2, R2>;
  markSynced: (ids: string[], ts: number) => Effect.Effect<void, E3, R3>;
}) {
  return function push(token: string, uploadCount: ProgressCb) {
    return Effect.gen(function* () {
      const data = yield* deps.allUnsync();
      const response = yield* deps.upload(token, data, uploadCount);
      if (response.status >= 400) {
        return yield* SimpleResponseError.fail(response);
      }
      const json = yield* parseJson(response.body);
      const parsed = z.safeParse(responseBodySchema, json);
      if (!parsed.success) return yield* ZodSchemaError.fail(parsed.error);
      const { timestamp, failedIds } = parsed.data;
      const failedSet = new Set(failedIds);
      const successDeletedIds = data.deleted.flatMap(({ id }) => (failedSet.has(id) ? [] : [id]));
      const successExistIds = data.exist.flatMap(({ id }) => (failedSet.has(id) ? [] : [id]));
      yield* Effect.all(
        [
          deps.markSynced(successDeletedIds, timestamp),
          deps.markSynced(successExistIds, timestamp),
        ],
        { concurrency: "unbounded" },
      );
      return yield* Effect.void;
    });
  };
}

export function simpleMerge<
  Exist extends { id: string; updatedAt: number },
  Deleted extends { id: string; deletedAt: number },
  E1,
  E2,
  E3,
  E4,
  R1,
  R2,
  R3,
  R4,
>(deps: {
  localUpdatedAt: (ids: string[]) => Effect.Effect<Map<string, number>, E1, R1>;
  deleteMany: (deleted: Deleted[], ts: number) => Effect.Effect<void, E2, R2>;
  upsertMany: (items: Exist[], ts: number) => Effect.Effect<void, E3, R3>;
  storeSet: (ts: number) => Effect.Effect<void, E4, R4>;
}) {
  return function sync(data: { exist: Exist[]; deleted: Deleted[]; timestamp: number }) {
    return Effect.gen(function* () {
      const local = yield* deps.localUpdatedAt(data.exist.map((e) => e.id));

      const toUpsert: Exist[] = [];
      for (const item of data.exist) {
        const localTs = local.get(item.id);
        if (localTs === undefined || localTs < item.updatedAt) {
          toUpsert.push(item);
        }
      }

      yield* deps.deleteMany(data.deleted, data.timestamp);
      yield* deps.upsertMany(toUpsert, data.timestamp);
      yield* deps.storeSet(data.timestamp);
    });
  };
}
