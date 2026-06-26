import { Context, Effect } from "effect";

export type Size = "big" | "small";
export type Theme = "light" | "dark" | "system";

export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  {
    size: {
      get: Effect.Effect<Size>;
      set: (size: Size) => Effect.Effect<void>;
    };
    theme: {
      get: Effect.Effect<Theme>;
      set: (theme: Theme) => Effect.Effect<void>;
    };
  }
>() {}
