import { Effect, Context, Data } from "effect";
import { NotFound } from "~/lib/effect-error";

export class StoreError extends Data.TaggedError("StoreError")<{ message: string }> {}

export class StoreService extends Context.Tag("StoreService")<
  StoreService,
  {
    get: <T>(id: string) => Effect.Effect<T, StoreError | NotFound>;
    /**
     * The whole store as one object, for a caller that needs every key at once
     * (the backup writes `store.json` wholesale). Read from the loaded instance,
     * not the file: the plugin writes on a debounce, so the file can trail the
     * preference the cashier just changed.
     */
    entries: () => Effect.Effect<Record<string, unknown>, StoreError>;
    set: <T>(id: string, value: T) => Effect.Effect<void, StoreError>;
    remove: (id: string) => Effect.Effect<void, StoreError>;
  }
>() {}
