import { cn } from "~/lib/utils";

/**
 * One progress bar, for every long job in the app.
 *
 * Shared with the sync bars rather than redrawn per feature: `SyncBar` and the
 * backup panel differ in what they measure, not in how a bar looks or what it
 * announces to a screen reader.
 *
 * `percent` is `null` while the work has no denominator yet — an indeterminate
 * sliver that pulses instead of a frozen empty track, which is the difference
 * between "still working" and "did nothing and stopped". It honours
 * `motion-reduce`, because a pulse nobody asked for is still motion.
 *
 * The fill carries a short transition so a page or a chunk landing glides instead
 * of jumping; the container is the layout, the fill is the only thing that moves.
 */
export function ProgressBar({
  percent,
  label,
  failed = false,
  className,
}: {
  /** 0…100, or `null` while the work has no denominator. */
  percent: number | null;
  /** What is progressing, for a screen reader — a bar is not self-describing. */
  label: string;
  failed?: boolean;
  className?: string;
}) {
  const determinate = percent !== null;
  const value = determinate ? Math.min(100, Math.max(0, Math.round(percent))) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={determinate ? value : undefined}
      aria-label={label}
      className={cn("relative h-2 overflow-hidden rounded-full bg-secondary", className)}
    >
      <div
        data-failed={failed ? "" : undefined}
        className={
          determinate
            ? "h-full rounded-full bg-active transition-[width] duration-500 ease-out data-[failed]:bg-destructive"
            : "h-full w-1/4 animate-pulse rounded-full bg-active motion-reduce:animate-none"
        }
        style={determinate ? { width: `${value}%` } : undefined}
      />
    </div>
  );
}
