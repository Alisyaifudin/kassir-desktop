import { Context, Effect } from "effect";
import z from "zod";
import { SimpleResponseError, ZodSchemaError } from "~/lib/effect-error";
import { UploadResponse } from "~/lib/stream";
import { parseJson } from "~/lib/utils";

type ProgressCb = (currentSize: number, totalSize: number) => void;

class Arg extends Context.Tag("Arg")<
  Arg,
  {
    readonly token: string;
    readonly cb: {
      uploadCount: ProgressCb;
      downloadCount: ProgressCb;
    };
  }
>() {}

class SyncReady<T, E, R> {
  constructor(private effect: Effect.Effect<T, E, R | Arg>) {}
  build() {
    const effect = this.effect;
    return function sync(
      token: string,
      cb: {
        uploadCount: ProgressCb;
        downloadCount: ProgressCb;
      },
    ) {
      return effect.pipe(
        Effect.provideService(Arg, {
          token,
          cb,
        }),
      );
    };
  }
}

const responseBodySchema = z.object({
  timestamp: z.number().min(0).max(1e16),
  failedIds: z.string().nonempty().max(100).array(),
});

// ============================================================================
// SyncMerge — stores the pull+merge effect, exposes .push()
// ============================================================================

class SyncMerge<
  Exist extends { id: string; updatedAt: number },
  Deleted extends { id: string; deletedAt: number },
  EMerge,
  RMerge,
> {
  constructor(private effect: Effect.Effect<void, EMerge, RMerge>) {}

  push<E1, E2, E3, R1, R2, R3>(deps: {
    upload: (
      token: string,
      payload: { exist: Exist[]; deleted: Deleted[] },
      cb: ProgressCb,
    ) => Effect.Effect<UploadResponse, E2, R2>;
    allUnsync: () => Effect.Effect<{ exist: Exist[]; deleted: Deleted[] }, E1, R1>;
    markSynced: (ids: string[], ts: number) => Effect.Effect<void, E3, R3>;
  }) {
    const mergeEffect = this.effect;
    const effect = Effect.gen(function* () {
      const { token, cb } = yield* Arg;
      yield* mergeEffect;
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
    return new SyncReady(effect);
  }
}

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
    private effect: Effect.Effect<
      { exist: Exist[]; deleted: Deleted[]; timestamp: number },
      EPull,
      RPull
    >,
  ) {}
  merge<E1, E2, E3, E4, R1, R2, R3, R4>(
    mergeFn: (data: {
      exist: Exist[];
      deleted: Deleted[];
      timestamp: number;
    }) => Effect.Effect<void, E1, R1>,
  ) {
    const pullEffect = this.effect;
    const effect = Effect.gen(function* () {
      const data = yield* pullEffect;
      yield* mergeFn(data);
    });
    return new SyncMerge<Exist, Deleted, EPull | E1 | E2 | E3 | E4, RPull | R1 | R2 | R3 | R4>(
      effect,
    );
  }
}

// ============================================================================
// pull — entry point, returns SyncPull
// ============================================================================

export class SyncMany {
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
  }): SyncPull<Exist, Deleted, E1 | E2, R1 | R2 | Arg> {
    const effect = Effect.gen(function* () {
      const { token, cb } = yield* Arg;
      const lastPullAt = yield* deps.storeGet();
      return yield* deps.serverGet(token, lastPullAt, cb.downloadCount);
    });

    return new SyncPull(effect);
  }
}
