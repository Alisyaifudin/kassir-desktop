import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

/**
 * The panel every settings screen puts a group of controls in: white on the
 * tinted canvas, one hairline, no shadow (elevation stays reserved for controls,
 * see DESIGN.md). The same panel as Beranda's cards, so the two screens read as
 * one app.
 *
 * The head bar carries the group's name and the one action that belongs to it to
 * the far edge, exactly like a Beranda card head — the shape is repeated, not
 * reinvented per page.
 */
export function Panel({
  title,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  action?: ReactNode;
  className?: string;
  /** For a panel that has to fill the screen and scroll inside, e.g. the log. */
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn("flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card", className)}
    >
      {title === undefined ? null : (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
          <h2 className="text-base font-semibold">{title}</h2>
          {action}
        </div>
      )}
      <div className={cn("flex flex-col gap-4 p-4", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
