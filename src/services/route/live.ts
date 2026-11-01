import { Effect, Layer, Ref } from "effect";
import { log } from "~/lib/log";
import { formatError } from "~/lib/utils";
import { LocalStorageService } from "../local-storage";
import { RouteService } from ".";
import {
  commitTo,
  parseStack,
  retargetBack,
  stackOf,
  type RouteEntry,
  type RouteIntent,
  type RouteStack,
} from "./stack";

const STACK_KEY = "route-stack";

export const RouteLive = Layer.effect(
  RouteService,
  Effect.gen(function* () {
    const storage = yield* LocalStorageService;

    // Hydrated once, at build time, like `ConfigLive`'s view preference: the very
    // first screen has to have somewhere to go back to. That is the whole reason
    // this lives in localStorage instead of in the router — a relaunched webview
    // has no session history left, and a stack that starts empty on a deep link
    // could only ever offer the route's own fallback.
    const stored = yield* storage.get<unknown>(STACK_KEY).pipe(
      Effect.map(parseStack),
      Effect.catchTag("NotFound", () => Effect.succeed<RouteStack>([])),
      Effect.catchTag("LocalStorageError", () => Effect.succeed<RouteStack>([])),
    );

    const stack = yield* Ref.make<RouteStack>(stored);
    const intent = yield* Ref.make<RouteIntent | null>(null);

    /**
     * Memory first, disk second: the session keeps its history even when
     * localStorage refuses the write, which is the same call `ConfigLive` makes for
     * the list's view preference.
     */
    const save = (next: RouteStack) =>
      storage.set(STACK_KEY, next).pipe(
        Effect.catchAll((error) => Effect.sync(() => log.error(formatError(error)))),
      );

    return {
      get: () => Ref.get(stack),

      intend: (url, behavior) => Ref.set(intent, { url, behavior }),

      commit: (entry: RouteEntry, action) =>
        Effect.gen(function* () {
          const armed = yield* Ref.get(intent);
          const before = yield* Ref.get(stack);
          const after = commitTo(before, armed, entry, action);
          if (after === before) return;
          yield* Ref.set(stack, after);
          // Always cleared: an intent that survived its navigation would be
          // applied to the next location that happens to name the same URL.
          yield* Ref.set(intent, null);
          yield* save(after);
        }),

      back: () =>
        Effect.gen(function* () {
          const current = yield* Ref.get(stack);
          if (current.length < 2) return null;
          const target = current[current.length - 2].url;
          const armed: RouteIntent = { url: target, behavior: "pop" };
          yield* Ref.set(intent, armed);
          return target;
        }),

      peekBack: () =>
        Effect.map(Ref.get(stack), (current) =>
          current.length < 2 ? null : current[current.length - 2].url,
        ),

      setBack: (url) =>
        Effect.gen(function* () {
          const before = yield* Ref.get(stack);
          const after = retargetBack(before, url);
          if (after === before) return;
          yield* Ref.set(stack, after);
          yield* save(after);
        }),

      reset: (url) =>
        Effect.gen(function* () {
          const next = stackOf(url, "reset");
          yield* Ref.set(stack, next);
          yield* Ref.set(intent, null);
          yield* save(next);
        }),
    };
  }),
);
