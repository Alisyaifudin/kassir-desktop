import { Effect } from "effect";
import { UploadResponse } from "../stream";
import { SimpleResponseError, ZodSchemaError } from "../effect-error";
import { parseJson } from "../utils";
import z from "zod";

type ProgressCb = (currentSize: number, totalSize: number) => void;

const responseBodySchema = z.object({
  timestamp: z.number().min(0).max(1e16),
  failedIds: z.string().nonempty().max(100).array(),
});

// ============================================================================
// SyncPull — stores the pull effect, exposes .merge()
// ============================================================================

class SyncPull<
  Exist extends { id: string; updatedAt: number },
  Deleted extends { id: string; deletedAt: number },
  EPull,
  RPull,
> {
  constructor(
    private _pull: (
      token: string,
      downloadCount: ProgressCb,
    ) => Effect.Effect<{ exist: Exist[]; deleted: Deleted[]; timestamp: number }, EPull, RPull>,
  ) {}

  merge<E1, E2, E3, E4, R1, R2, R3, R4>(deps: {
    localUpdatedAt: (ids: string[]) => Effect.Effect<Map<string, number>, E1, R1>;
    deleteMany: (deleted: Deleted[], ts: number) => Effect.Effect<void, E2, R2>;
    upsertMany: (items: Exist[], ts: number) => Effect.Effect<void, E3, R3>;
    storeSet: (ts: number) => Effect.Effect<void, E4, R4>;
  }) {
    const pullFn = this._pull;
    const effect = (token: string, downloadCount: ProgressCb) =>
      Effect.gen(function* () {
        const data = yield* pullFn(token, downloadCount);
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
    return new SyncMerge<Exist, Deleted, EPull | E1 | E2 | E3 | E4, RPull | R1 | R2 | R3 | R4>(
      effect,
    );
  }
}

// ============================================================================
// SyncMerge — stores the pull+merge effect, exposes .push()
// ============================================================================

class SyncMerge<
  Exist extends { id: string; updatedAt: number },
  Deleted extends { id: string; deletedAt: number },
  EMerge,
  RMerge,
> {
  constructor(
    private _merge: (
      token: string,
      downloadCount: ProgressCb,
    ) => Effect.Effect<void, EMerge, RMerge>,
  ) {}

  push<E1, E2, E3, R1, R2, R3>(deps: {
    upload: (
      token: string,
      payload: { exist: Exist[]; deleted: Deleted[] },
      cb: ProgressCb,
    ) => Effect.Effect<UploadResponse, E2, R2>;
    allUnsync: () => Effect.Effect<{ exist: Exist[]; deleted: Deleted[] }, E1, R1>;
    markSynced: (ids: string[], ts: number) => Effect.Effect<void, E3, R3>;
  }) {
    const mergeFn = this._merge;
    return (token: string, cb: { uploadCount: ProgressCb; downloadCount: ProgressCb }) =>
      Effect.gen(function* () {
        yield* mergeFn(token, cb.downloadCount);
        const data = yield* deps.allUnsync();
        const response = yield* deps.upload(token, data, cb.uploadCount);
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
      });
  }
}

// ============================================================================
// pull — entry point, returns SyncPull
// ============================================================================

export class Sync {
  static pull<
    Exist extends { id: string; updatedAt: number },
    Deleted extends { id: string; deletedAt: number },
    E1 = never,
    E2 = never,
    R1 = never,
    R2 = never,
  >(deps: {
    storeGet: () => Effect.Effect<number, E1, R1>;
    serverGet: (
      token: string,
      ts: number,
      cb: ProgressCb,
    ) => Effect.Effect<{ exist: Exist[]; deleted: Deleted[]; timestamp: number }, E2, R2>;
  }): SyncPull<Exist, Deleted, E1 | E2, R1 | R2> {
    const effect = (token: string, downloadCount: ProgressCb) =>
      Effect.gen(function* () {
        const lastPullAt = yield* deps.storeGet();
        return yield* deps.serverGet(token, lastPullAt, downloadCount);
      });
    return new SyncPull(effect);
  }
}
