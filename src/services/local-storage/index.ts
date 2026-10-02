import { Effect, Context, Data } from "effect";
import { NotFound } from "~/lib/effect-error";

export class LocalStorageError extends Data.TaggedError("LocalStorageError")<{ message: string }> {}

export class LocalStorageService extends Context.Tag("LocalStorageService")<
  LocalStorageService,
  {
    get: <T>(id: string) => Effect.Effect<T, LocalStorageError | NotFound>;
    set: <T>(id: string, value: T) => Effect.Effect<void, LocalStorageError>;
  }
>() {}
