import { getCurrentWebview } from "@tauri-apps/api/webview";
import { Effect, Layer, SubscriptionRef } from "effect";
import { formatError } from "~/lib/utils";
import { DEFAULT_ZOOM, ZOOM_LEVELS, ZoomError, ZoomService, iconScaleOf, type Zoom } from ".";
import { LocalStorageService } from "../local-storage";

/** localStorage key. One flat number on purpose: it is read before the app renders. */
const ZOOM_KEY = "zoom";

function parseZoom(value: unknown): Zoom {
  return ZOOM_LEVELS.find((level) => level === value) ?? DEFAULT_ZOOM;
}

export const ZoomLive = Layer.effect(
  ZoomService,
  Effect.gen(function* () {
    const storage = yield* LocalStorageService;

    // Hydrate once at build time, not on first read: `main.tsx` applies the level
    // before the first paint, and it has no await to spend on localStorage.
    const initialZoom = yield* storage.get<unknown>(ZOOM_KEY).pipe(
      Effect.map(parseZoom),
      Effect.catchTag("NotFound", () => Effect.succeed(DEFAULT_ZOOM)),
      Effect.catchTag("LocalStorageError", () => Effect.succeed(DEFAULT_ZOOM)),
    );

    const zoomRef = yield* SubscriptionRef.make<Zoom>(initialZoom);

    /**
     * The one place the app touches the webview's own scale. The ACL has to grant
     * `core:webview:allow-set-webview-zoom` for this to do anything; without it
     * Tauri refuses the call, which is a real failure and is reported rather than
     * swallowed — a slider that moves while the screen stays small is worse than
     * an error message.
     */
    function applyToWebview(zoom: Zoom): Effect.Effect<void, ZoomError> {
      return Effect.tryPromise({
        try: () => getCurrentWebview().setZoom(zoom),
        catch: (error) =>
          new ZoomError({ message: `Gagal mengatur zoom tampilan: ${formatError(error)}` }),
      });
    }

    /**
     * Mirrors the level into CSS as `--icon-scale`, which `global.css` multiplies
     * every lucide stroke by. A webview zoom scales the whole coordinate system,
     * so an uncompensated stroke reads as a marker pen at 200%; a fully
     * compensated one reads as a hairline — see `iconScaleOf`. Only written once
     * the webview accepted the scale, so the glyphs never thin out for a zoom
     * that did not happen.
     */
    function mirrorToCss(zoom: Zoom): void {
      document.documentElement.style.setProperty("--icon-scale", String(iconScaleOf(zoom)));
    }

    /** Scale the webview and the icon strokes together — one change, never half. */
    function scale(zoom: Zoom): Effect.Effect<void, ZoomError> {
      return applyToWebview(zoom).pipe(Effect.zipRight(Effect.sync(() => mirrorToCss(zoom))));
    }

    return {
      get: () => SubscriptionRef.get(zoomRef),
      apply: () => SubscriptionRef.get(zoomRef).pipe(Effect.flatMap(scale)),
      set: (zoom) =>
        scale(zoom).pipe(
          Effect.zipRight(SubscriptionRef.set(zoomRef, zoom)),
          // Memory and webview first, disk second: the screen is already at the
          // new scale, so a refused write must not undo it. localStorage fails on
          // a full or disabled profile, and the operator would otherwise watch the
          // slider snap back for a reason they cannot act on.
          Effect.zipRight(
            storage
              .set(ZOOM_KEY, zoom)
              .pipe(Effect.mapError((error) => new ZoomError({ message: error.message }))),
          ),
        ),
      changes: zoomRef.changes,
    };
  }),
);
