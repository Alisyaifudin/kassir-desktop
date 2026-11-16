import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { formatDate, formatTime } from "~/lib/date";
import { capitalize, cn } from "~/lib/utils";
import type { RecordFull } from "~/services/record";

/**
 * Which record this is, and where in the day it sits.
 *
 * The identity band of `Record/z-Detail/z-Identity`, plus the two steppers. They
 * live here rather than in the page header because they move through *the day*,
 * not through the period: `‹` is the record before this one in the rail, and the
 * counter beside them says how far through the day that is.
 *
 * Steppers walk **every** record in rail order, not only the ones that still need
 * a category. Hiding the finished ones would make the walk feel shorter and would
 * also make it impossible to revisit a guess the operator wants to change.
 */
export function Identity({
  record,
  index,
  total,
  stale,
  onPrevious,
  onNext,
}: {
  record: RecordFull;
  /** 0-based position in the day's rail. */
  index: number;
  total: number;
  /** The record moved after its lines were classified. */
  stale: boolean;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
}) {
  return (
    <header className="flex shrink-0 flex-col gap-1 border-b px-1 pb-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-xs font-bold",
              record.mode === "incoming"
                ? "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300"
                : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
            )}
          >
            {record.mode === "incoming" ? "↓ Masuk" : "↑ Keluar"}
          </span>
          {/* A ULID does not break by itself; let it truncate rather than push the
              steppers off the band. */}
          <p className="min-w-0 truncate text-muted-foreground" title={record.id}>
            No: {record.id}
          </p>
          {stale ? (
            <span
              className="shrink-0 text-xs font-semibold text-amber-600"
              title="Rekaman ini berubah setelah barisnya diklasifikasi"
            >
              berubah
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <p className="text-sm tabular-nums text-muted-foreground">
            Rek. {index + 1}/{total}
          </p>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Rekaman sebelumnya"
            title="Rekaman sebelumnya"
            disabled={onPrevious === null}
            onClick={() => onPrevious?.()}
            className="size-8 rounded-md"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Rekaman berikutnya"
            title="Rekaman berikutnya"
            disabled={onNext === null}
            onClick={() => onNext?.()}
            className="size-8 rounded-md"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <p className="min-w-0 truncate">
          Kasir {capitalize(record.cashier)} · {formatDate(record.date, "long")}{" "}
          {formatTime(record.date, "short")}
        </p>
        <p className="shrink-0 tabular-nums">
          Total <span className="font-semibold text-foreground">
            Rp{record.grandTotal.toLocaleString("id-ID")}
          </span>
        </p>
      </div>
    </header>
  );
}
