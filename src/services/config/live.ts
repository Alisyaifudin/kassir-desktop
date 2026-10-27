import { Effect, Layer, Ref } from "effect";
import { ConfigError, ConfigService, type ProductView } from ".";
import { LocalStorageService } from "../local-storage";

const PRODUCT_VIEW_KEY = "product-view";
const DEFAULT_PRODUCT_VIEW: ProductView = "grid";

function parseProductView(value: unknown): ProductView {
  return value === "grid" || value === "table" ? value : DEFAULT_PRODUCT_VIEW;
}

export const ConfigLive = Layer.effect(
  ConfigService,
  Effect.gen(function* () {
    const storage = yield* LocalStorageService;

    // Hydrate once at build time so a bare product list paints in the last used
    // view instead of snapping later.
    const initialView = yield* storage.get<unknown>(PRODUCT_VIEW_KEY).pipe(
      Effect.map(parseProductView),
      Effect.catchTag("NotFound", () => Effect.succeed(DEFAULT_PRODUCT_VIEW)),
      Effect.catchTag("LocalStorageError", () => Effect.succeed(DEFAULT_PRODUCT_VIEW)),
    );

    const viewRef = yield* Ref.make<ProductView>(initialView);

    return {
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
