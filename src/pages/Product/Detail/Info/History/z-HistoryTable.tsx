import { ExternalLink } from "lucide-react";
import { Link, useLocation } from "react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { formatDate, formatTime } from "~/lib/date";
import type { ProductEvent } from "~/services/product";

export function HistoryTable({ events }: { events: ProductEvent[] }) {
  const { pathname, search } = useLocation();
  // The current product-detail URL is the record's way back — including its own
  // `url_back`, so the chain (list → product → record) survives the detour.
  const urlBack = `${pathname}${search}`;

  return (
    <ul className="flex flex-col divide-y">
      {events.map((event) => {
        // One line of context under the date: a lot's cost going in, the price it
        // went out for, and nothing at all for a manual correction.
        const meta = [eventDetail(event), event.note].filter((part) => part !== "").join(" · ");

        return (
          <li key={event.id} className="flex items-center justify-between gap-2 py-2">
            <div className="flex min-w-0 flex-col">
              <span className="text-small tabular-nums">
                {formatDate(event.createdAt, "long")} {formatTime(event.createdAt)}
              </span>
              {meta === "" ? null : (
                <span className="truncate text-small text-muted-foreground">{meta}</span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={cn(
                  "text-small font-medium tabular-nums",
                  event.value > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : event.value < 0
                      ? "text-destructive"
                      : "text-muted-foreground",
                )}
              >
                {event.value > 0 ? "+" : ""}
                {event.value.toLocaleString("id-ID")}
              </span>
              {event.recordId !== null ? (
                <Button asChild size="icon" variant="ghost" className="size-6 shrink-0">
                  <Link
                    to={{
                      pathname: `/records/${event.recordId}`,
                      search: `?url_back=${encodeURIComponent(urlBack)}`,
                    }}
                    title="Buka catatan"
                    aria-label="Buka catatan"
                  >
                    <ExternalLink className="icon" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * What the row's second line says about the movement.
 *
 * Stock going *in* is a purchase, so its cost lot (`Modal`) is the figure that
 * matters. Stock going *out* is a sale — the `Modal` there is what the goods cost
 * us once, which says nothing about this movement — so the line names the price
 * it was sold at instead, read from the record line the event moved.
 *
 * A manual correction has no record line, and therefore no price: it gets
 * neither label, and the row falls back to its note alone. `""` means "nothing to
 * say here", not "zero".
 */
function eventDetail(event: ProductEvent): string {
  if (event.value >= 0) return `Modal ${event.capital.toLocaleString("id-ID")}`;
  return event.price === null ? "" : `Harga ${event.price.toLocaleString("id-ID")}`;
}
