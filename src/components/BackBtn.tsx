import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useBack } from "~/services/route/react";

/**
 * The way out of a screen, as the app's own history means it.
 *
 * `Back` is the stack's traversal, not `window.history`'s: every navigation is
 * written as a replace, so there is no browser entry behind this screen to go back
 * to. `useBack` reads the screen this one was entered from and pops to it, which is
 * why a screen opened from a filtered list returns to that list with its query
 * intact — and why nothing here has to guess, or be handed a `url_back`.
 *
 * `fallback` is for the screen that has nothing behind it: a deep link, a
 * bookmarked receipt, the first screen after a relaunch. It replaces the screen
 * being left, so a dead end cannot become a ping-pong between itself and the route
 * it escapes to.
 *
 * Icon-only, so the name has to be given: `label` is what a screen reader
 * announces, and it doubles as the tooltip.
 */
export function BackBtn({
  fallback = "/",
  label = "Kembali",
  className,
}: {
  /** Where a screen with nothing behind it returns to. */
  fallback?: string;
  /** The accessible name, and the tooltip. */
  label?: string;
  /** Extra classes — a tint, a size — merged over the defaults. */
  className?: string;
}) {
  const back = useBack(fallback);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={back}
      className={cn("rounded-full", className)}
    >
      <ArrowLeft className="size-6" />
    </Button>
  );
}
