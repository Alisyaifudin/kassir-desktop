import { Context, Effect } from "effect";
import z from "zod";
import { SimpleResponseError, ZodSchemaError } from "~/lib/effect-error";
import { UploadResponse } from "~/lib/stream";
import { parseJson } from "~/lib/utils";

type ProgressCb = (currentSize: number, totalSize: number) => void;

export class ManyArg extends Context.Tag("ManyArg")<
  ManyArg,
  {
    readonly token: string;
    readonly cb: {
      uploadCount: ProgressCb;
      downloadCount: ProgressCb;
    };
  }
>() {}

class OneArg extends Context.Tag("OneArg")<
  OneArg,
  {
    readonly token: string;
    readonly id: string;
  }
>() {}

function pullMany<
  Exist extends { id: string; updatedAt: number },
  Deleted,
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
  ) => Effect.Effect<{ exist: Exist[]; deleted: Deleted; timestamp: number }, E2, R2>;
}) {
  return Effect.gen(function* () {
    const { token, cb } = yield* ManyArg;
    const lastPullAt = yield* deps.storeGet();
    return yield* deps.serverGet(token, lastPullAt, cb.downloadCount);
  });
}

function mergeMany<
  Exist extends { id: string; updatedAt: number },
  Deleted,
  E1,
  E2,
  E3,
  E4,
  R1,
  R2,
  R3,
  R4,
>(
  data: { exist: Exist[]; deleted: Deleted[]; timestamp: number },
  deps: {
    localUpdatedAt: (ids: string[]) => Effect.Effect<Map<string, number>, E1, R1>;
    deleteMany: (deleted: Deleted[], ts: number) => Effect.Effect<void, E2, R2>;
    upsertMany: (items: Exist[], ts: number) => Effect.Effect<void, E3, R3>;
    storeSet: (ts: number) => Effect.Effect<void, E4, R4>;
  },
) {
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
}

const responseBodySchema = z.object({
  timestamp: z.number().min(0).max(1e16),
  failedIds: z.string().nonempty().max(100).array(),
});

function pushMany<
  Exist extends { id: string; updatedAt: number },
  Deleted extends { id: string; deletedAt: number },
  E1,
  E2,
  E3,
  R1,
  R2,
  R3,
>(deps: {
  upload: (
    token: string,
    payload: { exist: Exist[]; deleted: Deleted[] },
    cb: ProgressCb,
  ) => Effect.Effect<UploadResponse, E2, R2>;
  allUnsync: () => Effect.Effect<{ exist: Exist[]; deleted: Deleted[] }, E1, R1>;
  markSynced: (ids: string[], ts: number) => Effect.Effect<void, E3, R3>;
}) {
  return Effect.gen(function* () {
    const { token, cb } = yield* ManyArg;
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
      [deps.markSynced(successDeletedIds, timestamp), deps.markSynced(successExistIds, timestamp)],
      { concurrency: "unbounded" },
    );
  });
}

const oneResponseSchema = z.object({
  timestamp: z.number().min(0).max(1e16),
  isFailed: z.boolean(),
});

function pullOne<
  TData extends { id: string; updatedAt: number; deletedAt?: number },
  E = never,
  R = never,
>(deps: {
  serverGet: (token: string, id: string) => Effect.Effect<{ item: TData; timestamp: number }, E, R>;
}) {
  return Effect.gen(function* () {
    const { token, id } = yield* OneArg;
    return yield* deps.serverGet(token, id);
  });
}

function mergeOne<
  TData extends { id: string; updatedAt: number; deletedAt?: number },
  E1,
  E2,
  E3,
  R1,
  R2,
  R3,
>(
  data: { item: TData; timestamp: number },
  deps: {
    localUpdatedAt: (id: string) => Effect.Effect<number, E1, R1>;
    delete: (id: string) => Effect.Effect<void, E2, R2>;
    update: (item: TData, ts: number) => Effect.Effect<void, E3, R3>;
  },
) {
  return Effect.gen(function* () {
    const { item, timestamp } = data;
    if (item.deletedAt !== undefined) {
      return yield* deps.delete(item.id);
    }
    const localTs = yield* deps.localUpdatedAt(item.id);
    if (localTs < item.updatedAt) {
      yield* deps.update(item, timestamp);
    }
  });
}

function pushOne<TData extends { id: string }, E1, E2, E3, R1, R2, R3>(deps: {
  upload: (token: string, payload: TData) => Effect.Effect<UploadResponse, E2, R2>;
  getItem: (id: string) => Effect.Effect<TData, E1, R1>;
  markSynced: (id: string, ts: number) => Effect.Effect<void, E3, R3>;
}) {
  return Effect.gen(function* () {
    const { token, id } = yield* OneArg;
    const item = yield* deps.getItem(id);
    const response = yield* deps.upload(token, item);
    if (response.status >= 400) {
      return yield* SimpleResponseError.fail(response);
    }
    const json = yield* parseJson(response.body);
    const parsed = z.safeParse(oneResponseSchema, json);
    if (!parsed.success) return yield* ZodSchemaError.fail(parsed.error);
    const { timestamp, isFailed } = parsed.data;
    if (!isFailed) {
      yield* deps.markSynced(id, timestamp);
    }
  });
}

export const syncAdapter = {
  many: {
    pull: pullMany,
    merge: mergeMany,
    push: pushMany,
  },
  one: {
    pull: pullOne,
    merge: mergeOne,
    push: pushOne,
  },
};

export const createSync = {
  many<E = never, R = never>(effect: Effect.Effect<void, E, R | ManyArg>) {
    return function sync(
      token: string,
      cb: {
        uploadCount: ProgressCb;
        downloadCount: ProgressCb;
      },
    ) {
      return effect.pipe(
        Effect.provideService(ManyArg, {
          token,
          cb,
        }),
      );
    };
  },
  one<E = never, R = never>(effect: Effect.Effect<void, E, R | OneArg>) {
    return function sync(token: string, id: string) {
      return effect.pipe(
        Effect.provideService(OneArg, {
          token,
          id,
        }),
      );
    };
  },
};
