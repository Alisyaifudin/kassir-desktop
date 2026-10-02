import { Effect, Context, Data } from "effect";
import { NotFound } from "~/lib/effect-error";

export class StoreError extends Data.TaggedError("StoreError")<{ message: string }> {}

export class StoreService extends Context.Tag("StoreService")<
  StoreService,
  {
    get: <T>(id: string) => Effect.Effect<T, StoreError | NotFound>;
    set: <T>(id: string, value: T) => Effect.Effect<void, StoreError>
  }
>() {}
