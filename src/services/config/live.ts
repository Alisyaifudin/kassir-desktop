import { Effect, Layer, SubscriptionRef } from "effect";
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

    // Hydrate once at build time so `changes` replays the real value first.
    const initial = yield* storage.get<unknown>(SIZE_KEY).pipe(
      Effect.map(parseSize),
      Effect.catchTag("NotFound", () => Effect.succeed(DEFAULT_SIZE)),
      Effect.catchTag("LocalStorageError", () => Effect.succeed(DEFAULT_SIZE)),
    );

    const sizeRef = yield* SubscriptionRef.make<Size>(initial);

    return {
      size: {
        get: () => SubscriptionRef.get(sizeRef),
        set: (size) =>
          storage.set(SIZE_KEY, size).pipe(
            Effect.mapError((error) => new ConfigError({ message: error.message })),
            Effect.zipRight(SubscriptionRef.set(sizeRef, size)),
          ),
        changes: sizeRef.changes,
      },
    };
  }),
);
