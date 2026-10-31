import { forwardRef, useCallback, useEffect, type MouseEvent } from "react";
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  Outlet,
  createPath,
  useLocation,
  useNavigate as useRouterNavigate,
  useNavigationType,
  useResolvedPath,
  type LinkProps as RouterLinkProps,
  type NavLinkProps as RouterNavLinkProps,
  type NavigateOptions as RouterNavigateOptions,
  type To,
} from "react-router";
import { Effect } from "effect";
import { route } from "./instance";
import { pathnameOf, type RouteAction, type RouteBehavior } from "./stack";

/**
 * The door to the router.
 *
 * Components reach navigation through this module and never through
 * `react-router` itself: the stack in `~/services/route` has to see every
 * navigation, and a stray `useNavigate` import is a screen the stack cannot go back
 * to. The reads are re-exported unchanged — `useLocation` and `useSearchParams` are
 * the URL, and a second implementation of how a URL is parsed is exactly the kind
 * of duplicate source of truth this file exists to avoid.
 */
export { useLocation, useMatch, useMatches, useParams, useSearchParams } from "react-router";

/**
 * The one writer of the stack.
 *
 * Mounted once, as the root route's component, so every location change in the app
 * passes through it exactly once — including the ones this module did not make
 * (a redirect, a `window.location` write, the first screen after a reload). The
 * commit is in an effect rather than in render because writing state during render
 * is what React runs twice in StrictMode; `commitTo` collapses the duplicate
 * anyway, but the write itself belongs after the router has settled.
 */
export function RouteSync() {
  const { pathname, search, key } = useLocation();
  const url = `${pathname}${search}`;
  // `POP` on a screen the app did not navigate to is the webview's own history
  // moving — an Alt+Left, a mouse's back button — and the stack has to be told so
  // it truncates to that screen instead of recording a new one.
  const action = useNavigationType().toLowerCase() as RouteAction;

  useEffect(() => {
    Effect.runSync(route.commit({ url, key }, action));
  }, [url, key, action]);

  return <Outlet />;
}

export type NavigateOptions = {
  /** What this navigation does to the stack. Defaults to `push`. */
  behavior?: RouteBehavior;
  /** Passed through to the router, unchanged and unread. */
  state?: RouterNavigateOptions["state"];
};

/**
 * `navigate` with a behaviour instead of a `replace` flag.
 *
 * `replace: true` from react-router is not the same question: that says how to
 * write `window.history`, which now always gets a replace. The behaviour says what
 * the screen *is* — a new one, or the same one rewritten — and that is the part the
 * stack has to be told, because the router cannot know it.
 */
export function useNavigate() {
  const navigate = useRouterNavigate();
  const { pathname, search } = useLocation();
  const current = `${pathname}${search}`;

  return useCallback(
    (to: To, { behavior = "push", state }: NavigateOptions = {}) => {
      const url = urlOf(to, current);
      // Already showing. A second identical entry would be a back step the
      // operator cannot see.
      if (url === current) return;
      Effect.runSync(route.intend(url, behavior));
      return navigate(url, { replace: true, state });
    },
    [navigate, current],
  );
}

/**
 * Back, as the stack means it: the screen this one was entered from.
 *
 * The traversal is ours, not the browser's, because `window.history` holds a single
 * entry — `navigate(-1)` would leave the app if it did anything at all. `fallback`
 * is what a screen with nothing behind it returns to: a deep link, a relaunched
 * webview, the first screen of a session. That fallback replaces the screen being
 * left, so a `back` from a dead end cannot grow the stack into a ping-pong between
 * the dead end and the screen it escapes to.
 */
export function useBack(fallback: string = "/") {
  const navigate = useRouterNavigate();
  const go = useNavigate();

  return useCallback(() => {
    const target = Effect.runSync(route.back());
    if (target === null) {
      go(fallback, { behavior: "replace" });
      return;
    }
    navigate(target, { replace: true });
  }, [navigate, go, fallback]);
}

export type LinkProps = Omit<RouterLinkProps, "replace"> & {
  /** What this navigation does to the stack. Defaults to `push`. */
  behavior?: RouteBehavior;
};

/**
 * `Link` that tells the stack what it is.
 *
 * The real anchor is still react-router's: `href` rendering, Ctrl/⌘-click,
 * middle-click, `state` and relative resolution all keep working, and the stack only
 * hears about the clicks that actually navigate in-app.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { behavior = "push", to, onClick, ...rest },
  ref,
) {
  const resolved = useResolvedPath(to);
  const url = `${resolved.pathname}${resolved.search}`;

  return (
    <RouterLink
      ref={ref}
      to={to}
      replace
      onClick={(event) => {
        onClick?.(event);
        if (appNavigates(event)) Effect.runSync(route.intend(url, behavior));
      }}
      {...rest}
    />
  );
});

export type NavLinkProps = Omit<RouterNavLinkProps, "replace"> & {
  /**
   * What this navigation does to the stack. Defaults to `root`, because a nav link
   * is a section rather than a step.
   */
  behavior?: RouteBehavior;
  /**
   * A side effect that runs *alongside* the navigation, never instead of it: the
   * link still goes where it points.
   *
   * Closing a sheet, collapsing a menu, clearing a selection — the small things a
   * caller wants to happen because the operator left, which are not a reason to
   * stop them leaving. It runs on every click, including the modified ones
   * (Ctrl/⌘-click, middle-click) that the shell handles instead of the app.
   *
   * The one way it can take the navigation with it is `event.preventDefault()`,
   * which is deliberate and already the app's contract for a screen that must not
   * be left (a locked receipt dialog). It is called before the intent is recorded,
   * so a handler that opts out also leaves the stack untouched.
   */
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * `Link` for the app's sections, with react-router's active matching.
 *
 * A section is not a step: arriving at one pulls the stack back to the root and
 * pushes the section onto it, so `Beranda → Produk → Teh → Toko` leaves `Back`
 * pointing at `Beranda` rather than at the product the operator happened to be
 * reading. `behavior="push"` still says "a step from here", for a nav link that
 * genuinely is one.
 *
 * `onClick` is a side effect, not a replacement for the link: it runs first, the
 * navigation still happens unless the handler prevents it.
 */
export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { behavior = "root", to, onClick, ...rest },
  ref,
) {
  const resolved = useResolvedPath(to);
  const url = `${resolved.pathname}${resolved.search}`;

  return (
    <RouterNavLink
      ref={ref}
      to={to}
      replace
      onClick={(event) => {
        // The caller's side effect first, so it sees the click as the operator made
        // it — a handler that closes a sheet still closes it on a Ctrl-click, which
        // the app does not navigate on.
        onClick?.(event);
        if (appNavigates(event)) Effect.runSync(route.intend(url, behavior));
      }}
      {...rest}
    />
  );
});

/**
 * The URL an intent names.
 *
 * Absolute paths are taken as written, which is what every call site in the app
 * passes. A `To` carrying only a query is the same screen with a facet changed, so
 * it resolves against the screen showing. A relative path is left as written: it
 * will not match the location the router resolves, and `commitTo`'s fallback policy
 * then reads it as a screen change — the same answer react-router gives it.
 */
function urlOf(to: To, current: string): string {
  if (typeof to === "string") return to;
  if (to.pathname !== undefined) return createPath(to);
  return createPath({ pathname: pathnameOf(current), search: to.search, hash: to.hash });
}

/**
 * Does this click navigate the app itself?
 *
 * A modified click, a non-primary button and a link with a `target` belong to the
 * shell — a new tab, a download, a context menu — so the app never lands anywhere.
 * Recording an intent for one would leave it armed for whatever navigates next.
 */
function appNavigates(event: MouseEvent<HTMLAnchorElement>): boolean {
  if (event.defaultPrevented) return false;
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  return event.currentTarget.target === "";
}
