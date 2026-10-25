import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Result } from "~/components/Loader";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";

export type GateProps<T, E = unknown> = {
  /** One key (`pageData.use`) or several (`pageData.useAll`). */
  res: Result<T, E>;
  children: ReactNode | ((props: { data: T; refetching: boolean }) => ReactNode);
  /** What this widget looks like while its data is on its way. */
  skeleton?: ReactNode;
  /** Replaces the default inline error. Pass a render prop for a typed error. */
  error?: ReactNode | ((error: E) => ReactNode);
  /** Wire to `pageData.useRefresh()(key)` to make the default error retryable. */
  onRetry?: () => void;
  /**
   * How long to stay blank before the skeleton appears — the same anti-flash
   * window `Loader` uses. A local read answers in a few milliseconds, and a
   * placeholder that flickers for two frames reads as jank, not as progress.
   *
   * Pass `0` only for a region that reserves no space of its own; otherwise let
   * the page hold the region's floor (a `min-h`) so the delay hides the skeleton
   * without moving anything.
   */
  delay?: number;
};

/**
 * @deprecated Use `pageData.Gate`, which takes the keys it guards instead of a
 * `Result`. This one is kept only while the un-migrated pages still pass
 * `res={pageData.use(…)}`; it cannot tell which keys a body reads, so a body can
 * read a key it does not gate.
 *
 * Renders one widget from one page-data result.
 *
 * `init` → the skeleton, held back by `delay` ms so a fast load never flashes
 * it; `error` → an inline message (this widget degrades, the page does not);
 * `success` → the children, with `refetching` available for a dim-while-stale
 * treatment (`useDelayedFlag`).
 */
export function Gate<T, E = unknown>({
  res,
  children,
  skeleton,
  error,
  onRetry,
  delay = 200,
}: GateProps<T, E>) {
  const init = res.type === "init";
  // With no delay there is nothing to wait for: the skeleton is on the first
  // paint instead of after a blank window.
  const immediate = delay <= 0;
  const [delayed, setDelayed] = useState(false);

  useEffect(() => {
    if (!init || immediate) {
      setDelayed(false);
      return;
    }
    const timer = setTimeout(() => setDelayed(true), delay);
    return () => clearTimeout(timer);
  }, [init, delay, immediate]);

  if (res.type === "init") {
    if (!immediate && !delayed) return null;
    return <>{skeleton ?? <Skeleton className="h-8 w-full" />}</>;
  }

  if (res.type === "error") {
    if (typeof error === "function") return <>{error(res.error)}</>;
    if (error !== undefined) return <>{error}</>;
    return <InlineError error={res.error} onRetry={onRetry} />;
  }

  if (typeof children === "function") {
    return <>{children({ data: res.data, refetching: res.refetching === true })}</>;
  }
  return <>{children}</>;
}

/** A compact failure notice, sized to sit inside a widget rather than a page. */
export function InlineError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-small text-destructive"
    >
      <span className="min-w-0 truncate">{messageOf(error)}</span>
      {onRetry === undefined ? null : (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  );
}

/** Pulls a readable sentence out of a typed error, an `Error`, or anything else. */
export function messageOf(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Gagal memuat data.";
}

/**
 * Holds a placeholder back for `delay` ms, then draws it.
 *
 * Mount it **only while the region is waiting**: it is remounted — and its window
 * restarted — exactly when a region goes from "has content" back to "waiting",
 * and never when a sibling key arrives. That distinction is what keeps a
 * three-key region from blinking three times.
 */
export function Held({ delay, children }: { delay: number; children: ReactNode }) {
  const [shown, setShown] = useState(delay <= 0);

  useEffect(() => {
    if (delay <= 0) return;
    const timer = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return shown ? <>{children}</> : null;
}
