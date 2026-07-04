import { Context } from "effect";

export type Size = "big" | "small";
export type Theme = "light" | "dark" | "system";

export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  {
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
