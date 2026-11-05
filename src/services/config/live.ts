import { Effect, Layer, Ref } from "effect";
import { ConfigError, ConfigService, type ProductView } from ".";
import { DEFAULT_MARGIN_ESTIMATE, normalizeMarginEstimate, type MarginEstimate } from "../analytics";
import { LocalStorageService } from "../local-storage";

const PRODUCT_VIEW_KEY = "product-view";
const DEFAULT_PRODUCT_VIEW: ProductView = "grid";

const MARGIN_ESTIMATE_KEY = "margin-estimate";

function parseProductView(value: unknown): ProductView {
  return value === "grid" || value === "table" ? value : DEFAULT_PRODUCT_VIEW;
}

/**
 * A stored estimate, or the defaults when there is none to trust. Anything the
 * file may hold — a partial object from an older build, a string, a negative
 * number — is clamped by `normalizeMarginEstimate`, so a bad value can only cost
 * the operator their setting, never the page its arithmetic.
 */
function parseMarginEstimate(value: unknown): MarginEstimate {
  if (typeof value !== "object" || value === null) return DEFAULT_MARGIN_ESTIMATE;
  const stored = value as Partial<Record<keyof MarginEstimate, unknown>>;
  return normalizeMarginEstimate({
    percent: Number(stored.percent),
    raw: Number(stored.raw),
  });
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

    // Same reason, one step stronger: the Profit page's query takes these two
    // numbers, so a late read would mean a second run of the same SQL and a bar
    // that changes its height on its own.
    const initialEstimate = yield* storage.get<unknown>(MARGIN_ESTIMATE_KEY).pipe(
      Effect.map(parseMarginEstimate),
      Effect.catchTag("NotFound", () => Effect.succeed(DEFAULT_MARGIN_ESTIMATE)),
      Effect.catchTag("LocalStorageError", () => Effect.succeed(DEFAULT_MARGIN_ESTIMATE)),
    );

    const viewRef = yield* Ref.make<ProductView>(initialView);
    const estimateRef = yield* Ref.make<MarginEstimate>(initialEstimate);

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
      marginEstimate: {
        get: () => Ref.get(estimateRef),
        // Same posture as the view: the new rule applies to this session even if
        // the disk write fails, and the failure is reported rather than hidden.
        // Clamping happens here, once, so the ref never holds a value the query
        // would have to guard against.
        set: (estimate) => {
          const next = normalizeMarginEstimate(estimate);
          return Ref.set(estimateRef, next).pipe(
            Effect.zipRight(
              storage
                .set(MARGIN_ESTIMATE_KEY, next)
                .pipe(Effect.mapError((error) => new ConfigError({ message: error.message }))),
            ),
          );
        },
      },
    };
  }),
);
