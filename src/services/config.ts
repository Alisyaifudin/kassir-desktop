import { Context } from "effect";

export type Size = "big" | "small";
export type Theme = "light" | "dark" | "system";

export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  {
    size: {
      get: Size;
      useSize: () => Size;
      set: (size: Size) => void;
    };
    theme: {
      get: Theme;
      set: (theme: Theme) => void;
      useTheme: () => Theme;
    };
  }
>() {}
