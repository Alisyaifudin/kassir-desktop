import { Effect } from "effect";
import { ConfigService } from "./services/config";
import { setSize } from "./lib/size";
import { setTheme } from "./lib/theme";

export const init = Effect.gen(function* () {
  const config = yield* ConfigService;
  const [size, theme] = yield* Effect.all([config.size.get, config.theme.get], {
    concurrency: "unbounded",
  });
  setSize(size);
  setTheme(theme);
});
