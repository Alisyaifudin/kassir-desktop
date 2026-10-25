import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

/**
 * The demo's own treatment for stale data — **not** part of the pattern.
 *
 * `pageData` only says *that* a key is refetching; how that reads on screen is
 * each component's call. This widget family chose two looks: `dim` (mute the
 * content and sweep a highlight over it) and `spinner` (leave the content alone,
 * add a spinner). A different page could just as well use a "menyegarkan" chip,
 * a progress bar, or nothing at all.
 */
export function Stale({
  when,
  mode,
  children,
}: {
  when: boolean;
  mode: "dim" | "spinner" | "none";
  children: ReactNode;
}) {
  if (mode === "none") return <>{children}</>;

  return (
    <div className="relative" aria-busy={when || undefined}>
      <div
        className={cn(
          "transition-opacity duration-300",
          when && mode === "dim" && "pointer-events-none opacity-40",
        )}
      >
        {children}
      </div>

      {mode === "dim" ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 overflow-hidden rounded-md opacity-0 transition-opacity duration-300",
            when && "opacity-100",
          )}
        >
          <div className="absolute inset-y-0 -left-1/2 w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-foreground/20 to-transparent motion-reduce:animate-none" />
        </div>
      ) : (
        <span
          className={cn(
            "pointer-events-none absolute right-0 top-0 rounded-full bg-background/80 p-1 shadow-sm transition-opacity duration-300",
            when ? "opacity-100" : "opacity-0",
          )}
        >
          <Loader2 className="size-3.5 animate-spin text-muted-foreground motion-reduce:animate-none" />
        </span>
      )}

      {when ? (
        <span role="status" className="sr-only">
          Memperbarui data
        </span>
      ) : null}
    </div>
  );
}
