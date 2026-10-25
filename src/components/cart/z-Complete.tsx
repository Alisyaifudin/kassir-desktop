import { useEffect, useRef, useState } from "react";
import type Decimal from "decimal.js";
import { Effect, Either } from "effect";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { service } from "~/services";
import { programPrintReceipt } from "~/pages/Record/Item/z-Receipt/program-print-receipt";
import { rupiah } from "~/components/cart/util-rupiah";
import { useDialogLock } from "~/hooks/use-dialog-lock";

/**
 * The moment after a transaction is committed — the sale's or the purchase's,
 * one component because the exits, the restore latch and the print countdown
 * are the same on both screens. The record is already in `records`; the three
 * exits are deliberate:
 *
 *  - `Batal` turns it back into a draft (and undoes the stock movement), so a
 *    mistake stays editable instead of becoming history;
 *  - `Lihat detail` leaves it committed and opens the record;
 *  - `Cetak` prints the receipt, then counts down and closes by itself.
 */
export function Complete({
  mode,
  recordId,
  total,
  change,
  fix,
  credit = false,
  onRestoreStart,
  onRestoreEnd,
  onRestored,
  onClose,
}: {
  /** Which screen committed: only the wording and the record's back-link differ. */
  mode: "sale" | "purchase";
  recordId: string;
  total: Decimal;
  change: Decimal;
  fix: number;
  /** A purchase can be recorded as debt, with no payment at all. */
  credit?: boolean;
  onRestoreStart: () => void;
  onRestoreEnd: () => void;
  onRestored: (draftId: string) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<"cancel" | "print" | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // This is a real Radix modal, so the focus trap holds Tab in — but the cart's
  // F1/F2/F12 listener lives on `window` and would still fire behind it (F12
  // used to insert an extra empty draft here). Register it as the screen owner.
  useDialogLock(true);

  // A successful print runs this down; at zero the dialog gets out of the way.
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      closeRef.current();
      return;
    }
    const timer = setTimeout(
      () => setCountdown((value) => (value === null ? null : value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [countdown]);

  async function cancel() {
    setBusy("cancel");
    setError(null);
    onRestoreStart();
    const result = await Effect.runPromise(Effect.either(service.transaction.unsubmit(recordId)));
    if (Either.isLeft(result)) {
      onRestoreEnd();
      setBusy(null);
      setError(result.left.message);
      return;
    }
    // Close first: selecting the restored draft while the dialog still owns
    // `complete` would re-render it over the transaction for a frame.
    onClose();
    onRestored(result.right);
  }

  async function print() {
    setBusy("print");
    setError(null);
    const result = await Effect.runPromise(Effect.either(service.record.get.byId(recordId)));
    if (Either.isLeft(result)) {
      setBusy(null);
      setError(result.left.message);
      return;
    }
    // `programPrintReceipt` catches the Effect failures itself and answers what
    // the attempt did; only a failure blocks the countdown.
    const outcome = await Effect.runPromise(programPrintReceipt(result.right));
    if (!outcome.ok) {
      setBusy(null);
      setError(outcome.message);
      return;
    }
    setBusy(null);
    setCountdown(3);
  }

  const locked = busy !== null || countdown !== null;
  const title =
    mode === "sale" ? "Pembayaran berhasil" : credit ? "Kredit berhasil" : "Pembelian berhasil";
  const description =
    mode === "sale"
      ? "Transaksi sudah tersimpan."
      : credit
        ? "Pembelian sudah dicatat sebagai kredit."
        : "Transaksi pembelian sudah tersimpan.";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        // X and the backdrop both mean "continue": the record is already
        // committed, so closing only drops the dialog and starts the next sale.
        if (!open && !locked) onClose();
      }}
    >
      <DialogContent
        className="max-w-5xl"
        showCloseButton={!locked}
        onCloseAutoFocus={(event) => {
          // Do not hand focus back to Bayar: Enter/Space on it would submit the
          // restored draft immediately after Batalkan.
          event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (locked) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (locked) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (locked) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-big">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {credit ? (
          <p className="rounded-lg border bg-muted/30 px-3 py-6 text-small text-muted-foreground">
            Tidak ada pembayaran pada transaksi ini. Kredit dibayar lewat halaman Utang.
          </p>
        ) : (
          <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 px-3 py-10">
            <div className="flex items-center justify-between gap-3">
              <span className="text-normal text-muted-foreground">Pembayaran</span>
              <span className="text-big font-bold tabular-nums">{rupiah(total, fix)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-big text-muted-foreground">Kembalian</span>
              <span className="text-grand-total font-bold tabular-nums">{rupiah(change, fix)}</span>
            </div>
          </div>
        )}

        {error === null ? null : <p className="text-small text-destructive">{error}</p>}
        {countdown === null ? null : (
          <p className="text-small text-muted-foreground">Menutup dalam {countdown} detik...</p>
        )}

        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:flex-col">
          <div className="flex justify-between gap-2">
            <Button variant="destructive" disabled={locked} onClick={() => void cancel()}>
              {busy === "cancel" ? "Membatalkan..." : "Batalkan"}
            </Button>
            <Button asChild variant="secondary" disabled={locked}>
              <Link
                to={`/records/${recordId}?url_back=${encodeURIComponent(mode === "sale" ? "/pos" : "/restock")}`}
                aria-disabled={locked}
                className={locked ? "pointer-events-none opacity-50" : undefined}
                onClick={(event) => {
                  // The anchor owns the navigation, so the dialog closes by the
                  // route change instead of racing a state update.
                  if (locked) event.preventDefault();
                }}
              >
                Lihat detail
              </Link>
            </Button>
          </div>
          <Button className="w-full" disabled={locked} onClick={() => void print()}>
            {busy === "print" ? "Mencetak..." : countdown === null ? "Cetak" : "Tercetak"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
