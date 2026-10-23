import type { ReactNode } from "react";
import { SkeletonText } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

/**
 * A control whose value has not arrived yet.
 *
 * The real control — input, textarea, select trigger — renders disabled and
 * empty, so the box, its border, its padding and its chevron are the same box
 * they will be once the value lands; only the text inside pulses. Nothing about
 * the field changes size, and the label beside it never had to wait at all.
 */
export function PendingValue({
  children,
  /** Where the pulse sits; a textarea's value starts at the top, a row's is centred. */
  pulse = "left-3 top-1/2 w-24 -translate-y-1/2",
}: {
  children: ReactNode;
  pulse?: string;
}) {
  return (
    <div className="pointer-events-none relative" aria-busy="true">
      {children}
      <SkeletonText className={cn("absolute h-[0.6em]", pulse)} />
    </div>
  );
}
