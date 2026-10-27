import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

/**
 * Records the whole purchase as a debt and settles nothing now. It sits at the
 * top of the payment stage, away from `Bayar` at the bottom, and asks first —
 * a credit purchase is not a partial payment, it is a different kind of record.
 */
export function Kredit({
  onCredit,
  disabled,
}: {
  onCredit: () => Promise<string | null>;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    const failure = await onCredit();
    setBusy(false);
    if (failure !== null) {
      setError(failure);
      return;
    }
    // The commit succeeded and the page has mounted its own completion dialog;
    // this confirmation must not stay open underneath it, still bound to a
    // purchase that no longer exists. Closing also runs on the next tick of the
    // shop's workflow: dialog gone, `Complete` in front, one modal at a time.
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        if (next) setError(null);
      }}
    >
      <Button asChild variant="outline" disabled={disabled}>
        <DialogTrigger type="button">Kredit</DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl">Catat sebagai utang?</DialogTitle>
          <DialogDescription>
            Tidak ada pembayaran yang dicatat. Pembelian ini masuk sebagai utang dan dibayar
            lewat halaman Utang.
          </DialogDescription>
        </DialogHeader>
        <TextError>{error}</TextError>
        <DialogFooter>
          <Button
            variant="secondary"
            type="button"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            Batal
          </Button>
          <Button variant="destructive" disabled={busy} onClick={() => void confirm()}>
            {busy ? "Menyimpan..." : "Kredit"}
            <Spinner when={busy} />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
