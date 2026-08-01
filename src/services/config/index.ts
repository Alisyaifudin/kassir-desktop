import { Context, Effect } from "effect";
import { ConfigError } from "./error";

export type Size = "big" | "small";
export type Theme = "light" | "dark";

export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  {
    loader: () => Effect.Effect<{theme: Theme, size: Size}, ConfigError>
    size: {
      useSize: () => Size;
      set: (size: Size) => void;
    };
    theme: {
      useTheme: () => Theme;
      set: (theme: Theme) => void;
    };
  }
>() {}
