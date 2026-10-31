import { Effect, Layer } from "effect";
import { LocalStorageLive } from "../local-storage/live";
import { RouteService } from ".";
import { RouteLive } from "./live";

/**
 * The route stack, built once for the webview it belongs to.
 *
 * Every other service is assembled by `buildAppLive` because it sits on a backend
 * the harnesses swap — SQLite for the e2e build, the printer plugin, the store. This
 * one has nothing to swap: its backend is `localStorage`, which is the same inside
 * the app, the Playwright build and a bun test (happy-dom provides it). Registering
 * it in the layer graph would invent a seam nobody uses.
 *
 * `service.route` still exposes this same object, so nothing is duplicated — the
 * container re-exports the instance. Code that navigates reads it from here rather
 * than through `service`, because a test that stubs `~/services` with the one
 * service it needs (twelve files do) would otherwise leave every `Link` and
 * `Redirect` rendering without a stack.
 */
export const route = Effect.runSync(
  Effect.gen(function* () {
    return yield* RouteService;
  }).pipe(Effect.provide(RouteLive.pipe(Layer.provide(LocalStorageLive)))),
);

export type Route = typeof route;
