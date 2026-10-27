import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { formatDate, formatTime } from "~/lib/date";
import { capitalize } from "~/lib/utils";
import type { RecordFull } from "~/services/record";

/**
 * What this page is about, before any of its numbers: which record it is and
 * which day it belongs to. It sits above the ledger and never scrolls, so a page
 * read to the last line still answers "what am I looking at?".
 *
 * Both faces of a record share it — the full page and the pane that previews a
 * row — so the band cannot say one thing in one place and another in the other.
 * What each face adds is a slot, not a variant: the pane puts its close button at
 * the left of the first line and its way out to the full page at the right, the
 * page puts its date corrections at the right of the second.
 */
export function Identity({
  record,
  onClose,
  action,
  children,
}: {
  record: RecordFull;
  /** Closes the pane around the record — only a preview has one. */
  onClose?: () => void;
  /** The right side of the first line: the pane's way out to the full page. */
  action?: ReactNode;
  /** The right side of the second line: the owner's inline corrections. */
  children?: ReactNode;
}) {
  return (
    <header className="flex shrink-0 flex-col gap-1 border-b px-1 pb-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          {/* The close lives at the leading edge: the way out of a preview should
              not sit where the way into one does. */}
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
              <X className="size-5" />
            </Button>
          )}
          {/* A ULID does not break by itself; let it truncate rather than push
              the date out of the band. The full id is on the receipt. */}
          <p className="min-w-0 truncate text-muted-foreground" title={record.id}>
            No: {record.id}
          </p>
        </div>
        {action}
      </div>
      <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <p className="min-w-0 truncate ">
          Kasir {capitalize(record.cashier)} · Dibuat {formatDate(record.createdAt, "long")}{" "}
          {formatTime(record.createdAt, "short")}
        </p>
        {children}
      </div>
    </header>
  );
}
