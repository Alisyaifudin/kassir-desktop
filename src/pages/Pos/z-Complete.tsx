import { useEffect, useRef, useState } from "react";
import type Decimal from "decimal.js";
import { Effect, Either } from "effect";
import { useNavigate } from "react-router";
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
import { rupiah } from "./util-rupiah";

/**
 * The moment after a sale is committed. The record is already in `records`; the
 * three exits are deliberate:
 *
 *  - `Batal` turns it back into a draft (and undoes the stock movement), so a
 *    mistake stays editable instead of becoming history;
 *  - `Lihat detail` leaves it committed and opens the record;
 *  - `Cetak` prints the receipt, then counts down and closes by itself.
 */
export function Complete({
  recordId,
  total,
  change,
  fix,
  onRestored,
  onClose,
}: {
  recordId: string;
  total: Decimal;
  change: Decimal;
  fix: number;
  onRestored: (draftId: string) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"cancel" | "print" | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

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
    const result = await Effect.runPromise(Effect.either(service.transaction.unsubmit(recordId)));
    if (Either.isLeft(result)) {
      setBusy(null);
      setError(result.left.message);
      return;
    }
    onRestored(result.right);
    onClose();
  }

  function detail() {
    onClose();
    void navigate(`/records/${recordId}`);
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
    // `programPrintReceipt` returns null on success and an error message
    // otherwise; it catches the Effect failures itself.
    const message = await Effect.runPromise(programPrintReceipt(result.right));
    if (message !== null) {
      setBusy(null);
      setError(message);
      return;
    }
    setBusy(null);
    setCountdown(3);
  }

  const locked = busy !== null || countdown !== null;

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-big">Pembayaran berhasil</DialogTitle>
          <DialogDescription>
            Transaksi sudah tersimpan. Pilih salah satu langkah di bawah.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-normal text-muted-foreground">Total pembayaran</span>
            <span className="text-big font-bold tabular-nums">{rupiah(total, fix)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-normal text-muted-foreground">Kembalian</span>
            <span className="text-big font-bold tabular-nums">{rupiah(change, fix)}</span>
          </div>
        </div>

        {error === null ? null : <p className="text-small text-destructive">{error}</p>}
        {countdown === null ? null : (
          <p className="text-small text-muted-foreground">
            Menutup dalam {countdown} detik...
          </p>
        )}

        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:flex-col">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" disabled={locked} onClick={() => void cancel()}>
              {busy === "cancel" ? "Membatalkan..." : "Batal"}
            </Button>
            <Button variant="secondary" disabled={locked} onClick={detail}>
              Lihat detail
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
