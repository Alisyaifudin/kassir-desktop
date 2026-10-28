import { Context, Data, Effect, Stream } from "effect";

export class ZoomError extends Data.TaggedError("ZoomError")<{ message: string }> {}

/**
 * The interface scales the app offers, as the multiplier the webview's
 * `setZoom` takes. Four fixed steps rather than a continuous range: the layout
 * is designed at 100%, and every step above it is a legible bigger version of
 * that layout, not an arbitrary scale that can land between two sizes.
 */
export const ZOOM_LEVELS = [1, 1.25, 1.50, 1.75] as const;

export type Zoom = (typeof ZOOM_LEVELS)[number];

export const DEFAULT_ZOOM: Zoom = 1;

/** The level a slider step lands on. Out-of-range indices fall back to 100%. */
export function zoomAt(index: number): Zoom {
  return ZOOM_LEVELS[index] ?? DEFAULT_ZOOM;
}

/** The slider step a level sits on, so the control and the setting agree. */
export function zoomIndexOf(zoom: Zoom): number {
  const index = ZOOM_LEVELS.indexOf(zoom);
  return index === -1 ? 0 : index;
}

/** The readout beside the slider: `150%`, never `1.5%`. */
export function zoomPercent(zoom: Zoom): string {
  return `${Math.round(zoom * 100)}%`;
}

/**
 * How much to shrink icon strokes at `zoom`.
 *
 * A stroke drawn in the glyph's own units would scale with the webview and read
 * as a marker pen at 200%; dividing it by the zoom (constant on-screen weight)
 * reads as a hairline next to the doubled text. The square root splits the two:
 * the outline grows with the icon's *area* instead of its size.
 */
export function iconScaleOf(zoom: Zoom): number {
  return 1 / Math.sqrt(zoom);
}

export class ZoomService extends Context.Tag("ZoomService")<
  ZoomService,
  {
    /**
     * The stored level. The layer hydrates it at build time, so this is answered
     * synchronously — the boot-time apply and the slider's first render both need
     * it without waiting.
     */
    get: () => Effect.Effect<Zoom>;
    /** Persists the level and applies it to this webview. */
    set: (zoom: Zoom) => Effect.Effect<void, ZoomError>;
    /** Applies the stored level to this webview — what boot calls once. */
    apply: () => Effect.Effect<void, ZoomError>;
    changes: Stream.Stream<Zoom, ZoomError>;
  }
>() {}
