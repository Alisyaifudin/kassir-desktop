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
import { Skeleton } from "~/components/ui/skeleton";
import { service } from "~/services";
import type { Draft } from "~/services/transaction";
import { run } from "~/components/cart/run";
import { PaymentTime } from "~/components/cart/z-PaymentTime";
import { Customer } from "./z-Customer";
import { Precision } from "~/components/cart/z-Precision";
import { FlipMode } from "~/components/cart/z-FlipMode";

/**
 * The sale's optional details — precision, customer, payment time, note — behind
 * one small button at the top of the grand-total panel, so they stay out of the
 * settle strip until the operator asks for them.
 *
 * "Waktu pembayaran" is the only one that changes what `Bayar` writes; it is
 * the shared `PaymentTime` control, so the sale and the purchase settle their
 * records the same way.
 *
 * The dialog's footer also hides the way out of a sale that was never one: the
 * cart becomes a purchase and moves to Restock (`FlipMode`).
 */
export function Options({ draft, onStore }: { draft: Draft | null; onStore: () => void }) {
  // The button is static, so it is drawn at once; the dialog's fields read and
  // write the draft, so they are the only part held back.
  const disabled = draft === null;
  return (
    <Dialog>
      <Button
        asChild
        variant="ghost"
        size="icon"
        disabled={disabled}
        aria-label="Opsi transaksi"
        title="Opsi transaksi"
      >
        <DialogTrigger type="button">
          <SlidersHorizontal className="size-5" />
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Opsi transaksi</DialogTitle>
        </DialogHeader>
        <DialogDescription>Opsi untuk transaksi yang sedang disusun.</DialogDescription>
        <div className="flex flex-col gap-4">
          {draft === null ? (
            <OptionsSkeleton />
          ) : (
            <>
              <Precision draft={draft} />
              <Customer draft={draft} />
              <PaymentTime draft={draft} />
              <label className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground select-none">Catatan</span>
                <Textarea
                  rows={4}
                  value={draft.note}
                  placeholder="Catatan penjualan..."
                  onChange={(event) =>
                    run(service.transaction.set.note(draft.id, event.currentTarget.value))
                  }
                />
              </label>
            </>
          )}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {/* Only a real cart can change hands; the placeholder frame of the
              dialog's fields has nothing to flip. */}
          {draft === null ? null : <FlipMode draft={draft} />}
          <DialogClose asChild>
            <Button variant="secondary" type="button" onClick={onStore} disabled={disabled}>
              Simpan keranjang
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The dialog's four rows while the draft is still being read. */
function OptionsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Memuat opsi">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex flex-col gap-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
