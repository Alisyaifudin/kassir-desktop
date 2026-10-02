import { Effect, Layer } from "effect";
import { ConfigError, ConfigService, type Size } from ".";
import { LocalStorageService } from "../local-storage";

const SIZE_KEY = "size";
const DEFAULT_SIZE: Size = "big";

function parseSize(value: unknown): Size {
  return value === "small" || value === "big" ? value : DEFAULT_SIZE;
}

export const ConfigLive = Layer.effect(
  ConfigService,
  Effect.gen(function* () {
    const storage = yield* LocalStorageService;
    let cachedSize: Size | null = null;

    return {
      size: {
        get() {
          if (cachedSize !== null) {
            return Effect.succeed(cachedSize);
          }
          return storage.get<unknown>(SIZE_KEY).pipe(
            Effect.map(parseSize),
            Effect.catchTag("NotFound", () => Effect.succeed(DEFAULT_SIZE)),
            Effect.catchTag("LocalStorageError", (error) =>
              Effect.fail(new ConfigError({ message: error.message })),
            ),
            Effect.tap((size) =>
              Effect.sync(() => {
                cachedSize = size;
              }),
            ),
          );
        },
        set(size) {
          return storage.set(SIZE_KEY, size).pipe(
            Effect.mapError((error) => new ConfigError({ message: error.message })),
            Effect.tap(() =>
              Effect.sync(() => {
                cachedSize = size;
              }),
            ),
          );
        },
      },
    };
  }),
);
