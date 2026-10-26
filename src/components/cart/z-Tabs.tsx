import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
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
import { service } from "~/services";
import { STORED_FLAG, type Draft as DraftModel } from "~/services/transaction";
import { run } from "~/components/cart/run";
import { Kbd } from "~/components/ui/kdb";
import { Skeleton } from "~/components/ui/skeleton";
import { ReservedSkeleton } from "~/components/page-data";
import { Show } from "../Show";

/**
 * The open cart drafts, one `tx_records` row each. The number is the tab's
 * position and the title comes from the draft itself, so the cashier can leave a
 * half-finished sale (or a restocker a halfway trip) and start another.
 *
 * One component for both screens: `mode` decides whether a new tab is a sale or
 * a purchase. A parked sale collapses to its number and restores on click.
 *
 * Closing one is destructive — the row and any images it holds are removed from
 * disk — so it always confirms first.
 */
/** The id the strip's tabs point at; the screen renders the matching panel. */
const CART_TAB_PANEL_ID = "cart-panel";

/** The id of one cart's tab, which is also the panel's `aria-labelledby`. */
export function cartTabId(draftId: string): string {
  return `cart-tab-${draftId}`;
}

/**
 * The panel half of the tabs pattern: the body the strip switches — the stage
 * for the open cart — labelled by the selected tab. Without it the strip was a
 * `tablist` promising a panel that did not exist, so a screen reader in tabs
 * mode was offered panel navigation that led nowhere and was never told the
 * cart below had been replaced.
 *
 * `tabIndex={-1}` rather than `0`: the panel's first content is the cart grid,
 * which is itself focusable and owns the arrow keys, so the panel is a
 * programmatic target (and an `aria-labelledby` anchor) rather than a tab stop.
 */
/** `draftId` is absent while the drafts load: the panel exists, its tab does not yet. */
export function CartPanel({ draftId, children }: { draftId?: string; children: ReactNode }) {
  return (
    <div
      role="tabpanel"
      id={CART_TAB_PANEL_ID}
      aria-labelledby={draftId === undefined ? undefined : cartTabId(draftId)}
      tabIndex={-1}
      className="flex min-h-0 flex-1 flex-col outline-none"
    >
      {children}
    </div>
  );
}

export function Tabs({
  mode,
  drafts,
  activeId,
  onSelect,
  panelId = CART_TAB_PANEL_ID,
  loading = false,
}: {
  mode: "sale" | "purchase";
  drafts: DraftModel[];
  /** Empty while the drafts load — the strip (F12, `+`) is drawn regardless. */
  activeId?: string | null;
  onSelect: (id: string) => void;
  /** The `role="tabpanel"` these tabs own. */
  panelId?: string;
  /** The strip cannot say yet which cart is open — hold places instead of tabs. */
  loading?: boolean;
}) {
  const [pendingDelete, setPendingDelete] = useState<DraftModel | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /**
   * The ARIA tabs pattern, automatic activation: the arrows both select and move
   * focus, so a keyboard user reaches every cart with one Tab stop and never
   * lands on a row of delete buttons. `Delete` opens the same confirm dialog the
   * X does instead of destroying a cart silently.
   */
  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number) {
    const last = drafts.length - 1;
    const select = (next: number) => {
      const draft = drafts[next];
      if (draft === undefined) return;
      onSelect(draft.id);
      listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
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

  function create() {
    void Effect.runPromise(
      Effect.either(service.transaction.add.new(mode === "sale" ? "incoming" : "outcoming")),
    ).then((result) => {
      if (Either.isLeft(result)) {
        toast.error(result.left.message);
        return;
      }
      onSelect(result.right);
    });
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
        <Button
          className="rounded-full p-1"
          aria-label="Draft baru"
          title="Draft baru"
          onClick={create}
        >
          <Plus className="icon" />
        </Button>
        <div
          ref={listRef}
          role="tablist"
          aria-label="Transaksi terbuka"
          className="flex flex-1 items-center gap-1 overflow-x-auto"
        >
          {loading ? (
            // Three places for the carts that are on their way, *instead of* the
            // tabs rather than beside them: `loading` here means "this strip
            // cannot say yet which cart is open" — the drafts have not been read,
            // or they have and the screen is still looking up which one it
            // remembers. Drawing the real tabs unselected for those few
            // milliseconds would be a selection flicker, and drawing places
            // beside them would shift them sideways when the places go.
            //
            // `ReservedSkeleton`, not a plain placeholder: a read usually
            // answers in a few milliseconds, and grey tabs that live for two
            // frames read as jank. The places are taken from the first frame
            // and stay invisible for the 200 ms window, so the strip is already
            // its final height (a tab is taller than the F12/`+` chrome beside
            // it) and neither a fast read nor a slow one moves the panel.
            <ReservedSkeleton className="flex items-center gap-1">
              {/* Sized to a real tab: 123x41 big, 106x37 small. */}
              <Skeleton className="h-[40px] w-[200px] rounded-t-md small:h-[37px] small:w-[106px]" />
              <Skeleton className="h-[40px] w-[200px] rounded-t-md small:h-[37px] small:w-[106px]" />
              <Skeleton className="h-[40px] w-[200px] rounded-t-md small:h-[37px] small:w-[106px]" />
            </ReservedSkeleton>
          ) : (
            drafts.map((draft, index) => (
              <Tab
                key={draft.id}
                id={cartTabId(draft.id)}
                panelId={panelId}
                draft={draft}
                number={index + 1}
                total={drafts.length}
                selected={draft.id === activeId}
                onSelect={() => onSelect(draft.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                onClose={() => setPendingDelete(draft)}
              />
            ))
          )}
          <Show when={!loading && drafts.length > 1}>
            <Kbd className="py-4 mb-1">Ctrl+←/→</Kbd>
          </Show>
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
  id,
  panelId,
  draft,
  number,
  total,
  selected,
  onSelect,
  onKeyDown,
  onClose,
}: {
  id: string;
  panelId: string;
  draft: DraftModel;
  number: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onClose: () => void;
}) {
  const stored = (draft.flag & STORED_FLAG) !== 0;
  const title = stored ? `Transaksi tersimpan ${number}` : draft.title;
  // One tab stop for the whole strip; the arrows move between carts. The X stays
  // in the accessibility tree but out of the tab order (Delete does the same
  // thing from the tab), so Tabbing never walks a row of delete buttons.
  return (
    <div
      id={id}
      role="tab"
      aria-selected={selected}
      aria-controls={panelId}
      aria-label={`Transaksi ${title} (${number} dari ${total})`}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      title={stored ? title : undefined}
      className={cn(
        "flex shrink-0 cursor-pointer items-center gap-1 rounded-t-md border border-b-0 py-1 pl-2 pr-1 transition-colors",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
        selected ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
      )}
    >
      {stored ? null : (
        <span className="max-w-[160px] truncate text-small font-medium select-none">
          {draft.title}
        </span>
      )}
      <span
        className={cn(
          "rounded-full px-1.5 text-small font-bold tabular-nums select-none",
          selected ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
        )}
      >
        {number}
      </span>
      <Button
        variant="ghost"
        size="icon"
        tabIndex={-1}
        aria-label={`Hapus ${title}`}
        title={`Hapus ${title}`}
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
