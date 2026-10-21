import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Effect, Either } from "effect";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
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
import { Kbd } from "~/components/ui/kdb";
import { service } from "~/services";
import type { Draft as DraftModel } from "~/services/transaction";
import { run } from "~/components/cart/run";

/**
 * The open purchase drafts, one `tx_records` row each. The number is the tab's
 * position and the title comes from the draft itself, so a restocker can leave a
 * half-finished trip and start another.
 *
 * Closing one is destructive — the row and any images it holds are removed from
 * disk — so it always confirms first.
 */
export function Tabs({
  drafts,
  activeId,
  onSelect,
}: {
  drafts: DraftModel[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<DraftModel | null>(null);

  function create() {
    void Effect.runPromise(Effect.either(service.transaction.add.new("outcoming"))).then(
      (result) => {
        if (Either.isLeft(result)) {
          toast.error(result.left.message);
          return;
        }
        onSelect(result.right);
      },
    );
  }

  function confirmDelete() {
    if (pendingDelete === null) return;
    run(service.transaction.delete.byId(pendingDelete.id));
    setPendingDelete(null);
  }

  return (
    <div className="flex flex-col border-b">
      <div className="flex items-end gap-2 px-0.5 pt-0.5">
        <Kbd className="py-4 mb-1">F12</Kbd>
        <Button className="rounded-full p-1" title="Draft baru" onClick={create}>
          <Plus className="icon" />
        </Button>
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {drafts.map((draft, index) => (
            <Tab
              key={draft.id}
              draft={draft}
              number={index + 1}
              selected={draft.id === activeId}
              onSelect={() => onSelect(draft.id)}
              onClose={() => setPendingDelete(draft)}
            />
          ))}
        </div>
      </div>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => (open ? undefined : setPendingDelete(null))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-big">Hapus transaksi?</DialogTitle>
            <DialogDescription>
              Transaksi &ldquo;{pendingDelete?.title}&rdquo; beserta gambarnya akan dihapus dari
              perangkat. Tindakan ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" type="button">
                Batal
              </Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Tab({
  draft,
  number,
  selected,
  onSelect,
  onClose,
}: {
  draft: DraftModel;
  number: number;
  selected: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex shrink-0 cursor-pointer items-center gap-2 rounded-t-md border border-b-0 py-1 pl-3 pr-1.5 transition-colors",
        selected ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
      )}
    >
      <span className="max-w-[160px] truncate text-small font-medium select-none">
        {draft.title}
      </span>
      <span
        className={cn(
          "rounded-full px-1.5 text-small font-bold tabular-nums",
          selected ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
        )}
      >
        {number}
      </span>
      <Button
        variant="ghost"
        size="icon"
        title={`Tutup ${draft.title}`}
        className={cn(
          "size-6 rounded-full hover:bg-destructive hover:text-primary-foreground",
          selected ? "text-primary-foreground" : "text-muted-foreground",
        )}
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        <X className="icon" />
      </Button>
    </div>
  );
}
