import { Effect, Context } from "effect";
import type { RouteAction, RouteBehavior, RouteEntry, RouteStack } from "./stack";

export type {
  RouteAction,
  RouteBehavior,
  RouteEntry,
  RouteIntent,
  RouteStack,
} from "./stack";

/**
 * The app's own history.
 *
 * Every navigation is written as a `replace`, so `window.history` holds a single
 * entry and this stack is the history. A caller announces what a navigation means
 * (`intend`) *before* asking the router for it, and `commit` — the single writer,
 * driven by the location the router actually landed on — records it. Splitting it
 * in two is what keeps the stack honest: react-router's `navigate` is async and can
 * be refused by a `useBlocker`, so a stack written optimistically would remember
 * screens the operator never reached.
 *
 * Every method is infallible on purpose. A refused localStorage write (private
 * mode, a full disk) must never stop a navigation: the stack is a convenience over
 * the running session, and losing it costs the operator a `back` button, not the
 * screen they asked for. The failure is logged where `live.ts` reaches storage.
 */
export class RouteService extends Context.Tag("RouteService")<
  RouteService,
  {
    /** The committed stack, oldest first. The last entry is the screen showing. */
    get: () => Effect.Effect<RouteStack>;

    /** Announces the next navigation. Nothing is written until `commit` agrees. */
    intend: (url: string, behavior: RouteBehavior) => Effect.Effect<void>;

    /**
     * Reconciles the stack with the location react-router landed on.
     *
     * `action` is what the history did — react-router's `useNavigationType`, in this
     * file's vocabulary. A `pop` the app did not announce is a webview back gesture,
     * and it truncates rather than records.
     */
    commit: (entry: RouteEntry, action?: RouteAction) => Effect.Effect<void>;

    /**
     * The screen this one was entered from, armed as a pop; `null` at the root.
     *
     * The caller navigates to it, and the `commit` for that location is what
     * actually shortens the stack. `null` means there is nothing behind — a fresh
     * webview on a deep link — and the caller falls back to its own route.
     */
    back: () => Effect.Effect<string | null>;

    /**
     * The URL `back` would go to, without arming anything. `null` at the root.
     *
     * Reads the entry behind the screen showing, which is what a caller has to
     * rewrite when the screen it came from stops describing where they are — see
     * `setBack`.
     */
    peekBack: () => Effect.Effect<string | null>;

    /**
     * Rewrites the screen behind this one.
     *
     * One flow uses it: flipping a record's mode. The copy is a new screen, but the
     * list behind it was filtered by the old mode and no longer holds the record,
     * so `Back` has to land on that list with the filter moved. There is nothing to
     * rewrite at the root.
     */
    setBack: (url: string) => Effect.Effect<void>;

    /**
     * Forgets every screen. For auth transitions only: once the session is gone,
     * nothing behind the login screen may be reachable, or `Back` would walk back
     * into it.
     */
    reset: (url: string) => Effect.Effect<void>;
  }
>() {}
