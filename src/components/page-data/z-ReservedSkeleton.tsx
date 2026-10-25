import type { ReactNode } from "react";
import { useDelayedFlag } from "~/components/Loader";
import { cn } from "~/lib/utils";

/**
 * A skeleton that takes the region's space from the first frame but stays
 * invisible for the anti-flash window.
 *
 * For a region whose shape is authored by the skeleton itself (a form: same
 * labels, same controls, same gaps), this is the only way to get both:
 *
 * - the space is reserved immediately, so a fast read swaps an invisible
 *   placeholder for the real content with no layout shift;
 * - nothing grey is drawn until the read has proven itself slow, so a fast read
 *   never flashes a skeleton.
 *
 * A list body does not need it — there a `ROWS_FLOOR` on the container is the
 * floor, and `Gate`'s own delay is what hides the placeholder.
 */
export function ReservedSkeleton({
  children,
  className,
}: {
  children: ReactNode;
  /** Must reproduce the layout the real children will have (e.g. the panel's gaps). */
  className?: string;
}) {
  const visible = useDelayedFlag(true);

  return (
    <div className={cn(!visible && "opacity-0", className)} aria-hidden={!visible}>
      {children}
    </div>
  );
}
