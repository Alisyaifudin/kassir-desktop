import { Effect, Context, Data, Stream } from "effect";

export class ConfigError extends Data.TaggedError("ConfigError")<{ message: string }> {}

export type Size = "small" | "big";

export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  {
    size: {
      /** One-shot read of the current size. */
      get: () => Effect.Effect<Size, ConfigError>;
      /** Persists the size and pushes it to every `changes` subscriber. */
      set: (size: Size) => Effect.Effect<void, ConfigError>;
      /** Current size plus every subsequent change. */
      changes: Stream.Stream<Size>;
    };
  }
>() {}
