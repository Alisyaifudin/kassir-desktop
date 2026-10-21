import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
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
export function Kredit({ onCredit, disabled }: { onCredit: () => void; disabled: boolean }) {
  return (
    <Dialog>
      <Button asChild variant="outline" disabled={disabled}>
        <DialogTrigger type="button">Kredit</DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Catat sebagai utang?</DialogTitle>
          <DialogDescription>
            Tidak ada pembayaran yang dicatat. Pembelian ini masuk sebagai utang dan dibayar
            lewat halaman Utang.
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
            onClick={onCredit}
          >
            Kredit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
