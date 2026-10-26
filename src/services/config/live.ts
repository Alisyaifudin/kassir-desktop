import { Effect, Layer, Ref, SubscriptionRef } from "effect";
import { ConfigError, ConfigService, type ProductView, type Size } from ".";
import { LocalStorageService } from "../local-storage";

const SIZE_KEY = "size";
const DEFAULT_SIZE: Size = "big";

const PRODUCT_VIEW_KEY = "product-view";
const DEFAULT_PRODUCT_VIEW: ProductView = "grid";

function parseSize(value: unknown): Size {
  return value === "small" || value === "big" ? value : DEFAULT_SIZE;
}

function parseProductView(value: unknown): ProductView {
  return value === "grid" || value === "table" ? value : DEFAULT_PRODUCT_VIEW;
}

export const ConfigLive = Layer.effect(
  ConfigService,
  Effect.gen(function* () {
    const storage = yield* LocalStorageService;

    // Hydrate once at build time so `changes` replays the real value first, and
    // a bare product list paints in the last used view instead of snapping later.
    const initialSize = yield* storage.get<unknown>(SIZE_KEY).pipe(
      Effect.map(parseSize),
      Effect.catchTag("NotFound", () => Effect.succeed(DEFAULT_SIZE)),
      Effect.catchTag("LocalStorageError", () => Effect.succeed(DEFAULT_SIZE)),
    );
    const initialView = yield* storage.get<unknown>(PRODUCT_VIEW_KEY).pipe(
      Effect.map(parseProductView),
      Effect.catchTag("NotFound", () => Effect.succeed(DEFAULT_PRODUCT_VIEW)),
      Effect.catchTag("LocalStorageError", () => Effect.succeed(DEFAULT_PRODUCT_VIEW)),
    );

    const sizeRef = yield* SubscriptionRef.make<Size>(initialSize);
    const viewRef = yield* Ref.make<ProductView>(initialView);

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
      productView: {
        get: () => Ref.get(viewRef),
        // Memory first, disk second: a view change is a UI preference, not a
        // write the operator should have to retry. If localStorage refuses the
        // value the error is still reported, but this session keeps the view —
        // otherwise the toggle would look like it did nothing, because the URL
        // drops a default (`view=grid`) and the next read comes back here.
        set: (view) =>
          Ref.set(viewRef, view).pipe(
            Effect.zipRight(
              storage
                .set(PRODUCT_VIEW_KEY, view)
                .pipe(Effect.mapError((error) => new ConfigError({ message: error.message }))),
            ),
          ),
      },
    };
  }),
);
