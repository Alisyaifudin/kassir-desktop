import { Context, Effect } from "effect";
import { UploadResponse } from "../stream";
import { SimpleResponseError, ZodSchemaError } from "../effect-error";
import { parseJson } from "../utils";
import z from "zod";

class Arg extends Context.Tag("Arg")<
  Arg,
  {
    readonly token: string;
    readonly id: string;
  }
>() {}

class SyncReady<T, E, R> {
  constructor(private effect: Effect.Effect<T, E, R | Arg>) {}
  build() {
    const effect = this.effect;
    return function sync(token: string, id: string) {
      return effect.pipe(
        Effect.provideService(Arg, {
          token,
          id,
        }),
      );
    };
  }
}

const responseBodySchema = z.object({
  timestamp: z.number().min(0).max(1e16),
  isFailed: z.boolean(),
});

// ============================================================================
// SyncMerge — stores the pull+merge effect, exposes .push()
// ============================================================================

class SyncMerge<
  TData extends { id: string; updatedAt: number; deletedAt?: number },
  EMerge,
  RMerge,
> {
  constructor(private effect: Effect.Effect<void, EMerge, RMerge>) {}

  push<E1, E2, E3, R1, R2, R3>(deps: {
    upload: (token: string, payload: TData) => Effect.Effect<UploadResponse, E2, R2>;
    getItem: (id: string) => Effect.Effect<TData, E1, R1>;
    markSynced: (id: string, ts: number) => Effect.Effect<void, E3, R3>;
  }) {
    const mergeEffect = this.effect;
    const effect = Effect.gen(function* () {
      const { token, id } = yield* Arg;
      yield* mergeEffect;
      const item = yield* deps.getItem(id);
      const response = yield* deps.upload(token, item);
      if (response.status >= 400) {
        return yield* SimpleResponseError.fail(response);
      }
      const json = yield* parseJson(response.body);
      const parsed = z.safeParse(responseBodySchema, json);
      if (!parsed.success) return yield* ZodSchemaError.fail(parsed.error);
      const { timestamp, isFailed } = parsed.data;
      if (!isFailed) {
        yield* deps.markSynced(id, timestamp);
      }
    });
    return new SyncReady(effect);
  }
}

// ============================================================================
// SyncPull — stores the pull effect, exposes .merge()
// ============================================================================

class SyncPull<TData extends { id: string; updatedAt: number; deletedAt?: number }, EPull, RPull> {
  constructor(private effect: Effect.Effect<{ item: TData; timestamp: number }, EPull, RPull>) {}

  merge<E1, E2, E3, R1, R2, R3>(deps: {
    localUpdatedAt: (id: string) => Effect.Effect<number, E1, R1>;
    delete: (id: string) => Effect.Effect<void, E2, R2>;
    update: (item: TData, ts: number) => Effect.Effect<void, E3, R3>;
  }) {
    const pullEffect = this.effect;
    const effect = Effect.gen(function* () {
      const { item, timestamp } = yield* pullEffect;
      if (item.deletedAt !== undefined) {
        yield* deps.delete(item.id);
        return;
      }
      const localTs = yield* deps.localUpdatedAt(item.id);
      if (localTs < item.updatedAt) {
        yield* deps.update(item, timestamp);
      }
    });
    return new SyncMerge<TData, EPull | E1 | E2 | E3, RPull | R1 | R2 | R3>(effect);
  }
}

// ============================================================================
// pull — entry point, returns SyncPull
// ============================================================================

export class SyncOne {
  static pull<
    TData extends { id: string; updatedAt: number; deletedAt?: number },
    E = never,
    R = never,
  >(deps: {
    serverGet: (
      token: string,
      id: string,
    ) => Effect.Effect<{ item: TData; timestamp: number }, E, R>;
  }): SyncPull<TData, E, R | Arg> {
    const effect = Effect.gen(function* () {
      const { token, id } = yield* Arg;
      return yield* deps.serverGet(token, id);
    });

    return new SyncPull(effect);
  }
}
