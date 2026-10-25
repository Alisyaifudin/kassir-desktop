import type Decimal from "decimal.js";
import { Effect, Either } from "effect";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useDialogLock } from "~/hooks/use-dialog-lock";
import { rupiah } from "~/components/cart/util-rupiah";
import { service } from "~/services";

/**
 * The moment after a hand-typed record is written — the same dialog Pos shows,
 * minus the receipt: the record is already in `records`, so the two exits are
 * deliberate.
 *
 *  - `Batalkan` deletes it again, so a mistake does not become history;
 *  - `Lihat detail` leaves it committed and opens the record.
 *
 * Closing with X or Escape keeps the record; the screen then starts a fresh one.
 * The dialog takes the screen lock while it is open, because the page's F1
 * listener lives on `window` and would otherwise reach `Simpan` behind it.
 */
export function Complete({
  recordId,
  total,
  onClose,
}: {
  recordId: string;
  total: Decimal;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useDialogLock(true);

  async function cancel() {
    setBusy(true);
    setError(null);
    const result = await Effect.runPromise(Effect.either(service.record.delete.byId(recordId)));
    if (Either.isLeft(result)) {
      setBusy(false);
      setError(result.left.message);
      return;
    }
    toast("Transaksi dibatalkan");
    onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        // X and the backdrop mean "continue": the record is already committed.
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="max-w-5xl"
        showCloseButton={!busy}
        onCloseAutoFocus={(event) => {
          // Do not hand focus back to Simpan: Enter/Space there would save the
          // reset form's empty line immediately.
          event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (busy) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-big">Transaksi tersimpan</DialogTitle>
          <DialogDescription>
            Transaksi manual sudah dicatat; tidak ada stok yang berubah.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-6">
          <span className="text-normal text-muted-foreground">Total</span>
          <span className="text-big font-bold tabular-nums">{rupiah(total, 0)}</span>
        </div>

        {error === null ? null : <p className="text-small text-destructive">{error}</p>}

        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:justify-between">
          <Button variant="destructive" disabled={busy} onClick={() => void cancel()}>
            {busy ? "Membatalkan..." : "Batalkan"}
          </Button>
          <Button asChild variant="secondary" disabled={busy}>
            <Link
              to={`/records/${recordId}?url_back=${encodeURIComponent("/transaction")}`}
              aria-disabled={busy}
              className={busy ? "pointer-events-none opacity-50" : undefined}
              onClick={(event) => {
                if (busy) event.preventDefault();
              }}
            >
              Lihat detail
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
