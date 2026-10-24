import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { formatDate, formatTime } from "~/lib/date";
import { capitalize, cn } from "~/lib/utils";
import type { RecordFull } from "~/services/record";

/**
 * What this page is about, before any of its numbers: which way the money moved,
 * whether it is settled, which id, and which day it belongs to. It sits above
 * the ledger and never scrolls, so a page read to the last line still answers
 * "what am I looking at?".
 *
 * The mode and state chips are the same vocabulary the receipt prints (Jual /
 * Beli, Lunas / Kredit); colour is spent on the state only, because "unpaid" is
 * the one thing here that changes what the reader should do next.
 *
 * Both faces of a record share it — the full page and the pane that previews a
 * row — so the band cannot say one thing in one place and another in the other.
 * What each face adds is a slot, not a variant: the full page puts its date
 * corrections at the right of the second line, the pane puts a close button at
 * the right of the first.
 */
export function Identity({
  record,
  onClose,
  children,
}: {
  record: RecordFull;
  /** Closes the pane around the record — only a preview has one. */
  onClose?: () => void;
  /** The right side of the second line: the owner's inline corrections. */
  children?: ReactNode;
}) {
  const purchase = record.mode === "outcoming";

  return (
    <header className="flex shrink-0 flex-col gap-1 border-b px-1 pb-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-md bg-secondary px-2  font-bold">
            {purchase ? "Beli" : "Jual"}
          </span>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1.5  font-bold",
              record.isCredit
                ? "text-destructive"
                : "text-emerald-600 dark:text-emerald-500",
            )}
          >
            <span aria-hidden className="size-2 rounded-full bg-current" />
            {record.isCredit ? "Kredit" : "Lunas"}
          </span>
          {/* A ULID does not break by itself; let it truncate rather than push
              the date out of the band. The full id is on the receipt. */}
          <p className="min-w-0 truncate  text-muted-foreground" title={record.id}>
            No: {record.id}
          </p>
        </div>
        {onClose === undefined ? null : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Tutup pratinjau"
            title="Tutup pratinjau"
            className="shrink-0"
          >
            <X className="icon" />
          </Button>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 text-small text-muted-foreground">
        <p className="min-w-0 truncate ">
          Kasir {capitalize(record.cashier)} · Dibuat {formatDate(record.createdAt, "long")}{" "}
          {formatTime(record.createdAt, "short")}
        </p>
        {children}
      </div>
    </header>
  );
}
