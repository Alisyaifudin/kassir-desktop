import { Context } from "effect";

interface Path {
  /**
   * A URL pathname, beginning with a /.
   */
  pathname: string;
  /**
   * A URL search string, beginning with a ?.
   */
  search: string;
  /**
   * A URL fragment identifier, beginning with a #.
   */
  hash: string;
}

export type To = string | Partial<Path>;

type RelativeRoutingType = "route" | "path";
interface NavigateOptions {
  /** Replace the current entry in the history stack instead of pushing a new one */
  replace?: boolean;
  /** Adds persistent client side routing state to the next location */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state?: any;
  /** If you are using {@link https://api.reactrouter.com/v7/functions/react_router.ScrollRestoration.html <ScrollRestoration>}, prevent the scroll position from being reset to the top of the window when navigating */
  preventScrollReset?: boolean;
  /** Defines the relative path behavior for the link. "route" will use the route hierarchy so ".." will remove all URL segments of the current route pattern while "path" will use the URL path so ".." will remove one URL segment. */
  relative?: RelativeRoutingType;
  /** Wraps the initial state update for this navigation in a {@link https://react.dev/reference/react-dom/flushSync ReactDOM.flushSync} call instead of the default {@link https://react.dev/reference/react/startTransition React.startTransition} */
  flushSync?: boolean;
  /** Enables a {@link https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API View Transition} for this navigation by wrapping the final state update in `document.startViewTransition()`. If you need to apply specific styles for this view transition, you will also need to leverage the {@link https://api.reactrouter.com/v7/functions/react_router.useViewTransitionState.html useViewTransitionState()} hook.  */
  viewTransition?: boolean;
}

interface NavigateFunction {
  (to: To, options?: NavigateOptions): void | Promise<void>;
  (delta: number): void | Promise<void>;
}

export class RouterService extends Context.Tag("RouterService")<
  RouterService,
  {
    useLocation: () => Path;
    useNavigate: () => NavigateFunction;
    useGetUrlBack: (defaultPath: string) => string;
  }
>() {}
