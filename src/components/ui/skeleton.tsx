import { cn } from "~/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted rounded-md animate-pulse", className)}
      {...props}
    />
  );
}

/**
 * A placeholder that stands *inside* a line of text rather than replacing the
 * block around it: same baseline, height kept under the line box, so the real
 * value can arrive without moving anything else on the card.
 *
 * Size it to the value it stands in for (`w-28` for an amount, `w-5` for a
 * count); the height follows the inherited font size.
 */
function SkeletonText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="skeleton-text"
      aria-hidden="true"
      className={cn(
        "inline-block h-[0.8em] w-16 animate-pulse rounded-sm bg-muted align-baseline",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton, SkeletonText };
