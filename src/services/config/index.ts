import { Effect, Context, Data, Stream } from "effect";

export class ConfigError extends Data.TaggedError("ConfigError")<{ message: string }> {}

export type Size = "small" | "big";

export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  {
    size: {
      get: () => Effect.Effect<Size, ConfigError>;
      set: (size: Size) => Effect.Effect<void, ConfigError>;
      changes: Stream.Stream<Size>;
    };
  }
>() {}
