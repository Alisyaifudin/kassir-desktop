import { useEffect, useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kdb";
import { isScreenOwnedByDialog } from "~/hooks/use-dialog-lock";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import type { Draft } from "~/services/transaction";

/**
 * The open adjustment tabs, in the Pos strip's idiom: numbers, a title, an X,
 * and a `+`. One tab stop for the whole strip — arrows move between tabs and
 * `Delete` opens the same confirm dialog the X does.
 *
 * Nothing is parked here (that is the cart screens' `STORED_FLAG`); a tab is
 * either open or deleted, so the strip only ever shows `ADJUSTMENT_CART_FLAG`
 * rows.
 *
 * F12 opens a tab and Ctrl+←/→ walks them, matching the cart screens. The
 * arrows stay out of text fields, where Ctrl+Arrow is a word-jump.
 */
export function Tabs({
  drafts,
  activeId,
  onSelect,
  onCreate,
  onDelete,
}: {
  drafts: Draft[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<Draft | null>(null);

  // F12 / Ctrl+Arrow work from anywhere on the screen. A dialog owns the
  // keyboard while it is open, so the shortcuts wait for it to close.
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (isScreenOwnedByDialog()) return;

      if (event.key === "F12") {
        event.preventDefault();
        onCreate();
        return;
      }

      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      // The line editor keeps its own Ctrl+Arrow word-jump.
      const target = event.target as HTMLElement | null;
      if (
        target !== null &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (drafts.length === 0) return;

      event.preventDefault();
      const index = drafts.findIndex((draft) => draft.id === activeId);
      const step = event.key === "ArrowRight" ? 1 : -1;
      const next = drafts[(index + step + drafts.length) % drafts.length];
      if (next !== undefined) onSelect(next.id);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drafts, activeId, onCreate, onSelect]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number) {
    const last = drafts.length - 1;
    const select = (next: number) => {
      const draft = drafts[next];
      if (draft === undefined) return;
      onSelect(draft.id);
      event.currentTarget.parentElement
        ?.querySelectorAll<HTMLElement>('[role="tab"]')
        [next]?.focus();
    };
    switch (event.key) {
      case "Enter":
      case " ":
        event.preventDefault();
        select(index);
        return;
      case "ArrowLeft":
        event.preventDefault();
        select(index === 0 ? last : index - 1);
        return;
      case "ArrowRight":
        event.preventDefault();
        select(index === last ? 0 : index + 1);
        return;
      case "Home":
        event.preventDefault();
        select(0);
        return;
      case "End":
        event.preventDefault();
        select(last);
        return;
      case "Delete": {
        const draft = drafts[index];
        if (draft === undefined) return;
        event.preventDefault();
        setPendingDelete(draft);
        return;
      }
      default:
    }
  }

  return (
    <div className="flex flex-none items-end gap-2 border-b px-1 pt-1">
      <Kbd className="mb-2">F12</Kbd>
      <Button
        className="mb-1 rounded-full p-1"
        aria-label="Tab baru"
        title="Tab baru (F12)"
        onClick={onCreate}
      >
        <Plus className="icon" />
      </Button>
      <div
        role="tablist"
        aria-label="Transaksi terbuka"
        className="flex flex-1 items-center gap-1 overflow-x-auto"
      >
        {drafts.map((draft, index) => {
          const selected = draft.id === activeId;
          const label = draft.title.trim() === "" ? "Transaksi Baru" : draft.title;
          return (
            <div
              key={draft.id}
              role="tab"
              aria-selected={selected}
              aria-label={`${label} (${index + 1} dari ${drafts.length})`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(draft.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                "flex shrink-0 cursor-pointer items-center gap-1 rounded-t-md border border-b-0 py-1 pr-1 pl-2 transition-colors",
                "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                selected ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
              )}
            >
              <span className="max-w-[160px] truncate text-small font-medium select-none">
                {label}
              </span>
              <span
                className={cn(
                  "rounded-full px-1.5 text-small font-bold tabular-nums select-none",
                  selected ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
                )}
              >
                {index + 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                tabIndex={-1}
                aria-label={`Hapus ${label}`}
                title={`Hapus ${label}`}
                className={cn(
                  "size-6 rounded-full hover:bg-destructive hover:text-primary-foreground",
                  selected ? "text-primary-foreground" : "text-muted-foreground",
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  setPendingDelete(draft);
                }}
              >
                <X className="icon" />
              </Button>
            </div>
          );
        })}
        {drafts.length > 1 ? <Kbd className="mb-2 ml-1">Ctrl+←/→</Kbd> : null}
      </div>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => (open ? undefined : setPendingDelete(null))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-big">Hapus transaksi?</DialogTitle>
            <DialogDescription>
              Tab &ldquo;{pendingDelete?.title ?? "Transaksi Baru"}&rdquo; beserta barisnya akan
              dihapus dari perangkat. Tindakan ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" type="button">
                Batal
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingDelete === null) return;
                onDelete(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
