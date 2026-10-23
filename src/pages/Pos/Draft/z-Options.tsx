import { SlidersHorizontal } from "lucide-react";
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
import { Textarea } from "~/components/ui/textarea";
import { service } from "~/services";
import type { Draft } from "~/services/transaction";
import { run } from "~/components/cart/run";
import { PaymentTime } from "~/components/cart/z-PaymentTime";
import { Customer } from "./z-Customer";
import { Precision } from "~/components/cart/z-Precision";

/**
 * The sale's optional details — precision, customer, payment time, note — behind
 * one small button at the top of the grand-total panel, so they stay out of the
 * settle strip until the operator asks for them.
 *
 * "Waktu pembayaran" is the only one that changes what `Bayar` writes; it is
 * the shared `PaymentTime` control, so the sale and the purchase settle their
 * records the same way.
 */
export function Options({ draft, onStore }: { draft: Draft; onStore: () => void }) {
  return (
    <Dialog>
      <Button
        asChild
        variant="ghost"
        size="icon"
        aria-label="Opsi transaksi"
        title="Opsi transaksi"
      >
        <DialogTrigger type="button">
          <SlidersHorizontal className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-big">Opsi transaksi</DialogTitle>
        </DialogHeader>
        <DialogDescription>Opsi untuk transaksi yang sedang disusun.</DialogDescription>
        <div className="flex flex-col gap-4">
          <Precision draft={draft} />
          <Customer draft={draft} />
          <PaymentTime draft={draft} />
          <label className="flex flex-col gap-1">
            <span className="text-small text-muted-foreground select-none">Catatan</span>
            <Textarea
              rows={4}
              value={draft.note}
              placeholder="Catatan penjualan..."
              onChange={(event) =>
                run(service.transaction.set.note(draft.id, event.currentTarget.value))
              }
            />
          </label>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" type="button" onClick={onStore}>
              Simpan keranjang
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
