import { SlidersHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { service } from "~/services";
import type { Draft } from "~/services/transaction";
import { run } from "~/pages/_cart/run";
import { Customer } from "./z-Customer";
import { Precision } from "~/pages/_cart/z-Precision";

/**
 * The sale's optional details — precision, customer, note — behind one small
 * button at the top of the grand-total panel, so they stay out of the settle
 * strip until the operator asks for them.
 */
export function Options({ draft, onStore }: { draft: Draft; onStore: () => void }) {
  return (
    <Dialog>
      <Button asChild variant="ghost" size="icon" title="Opsi transaksi">
        <DialogTrigger type="button">
          <SlidersHorizontal className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-big">Opsi transaksi</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Precision draft={draft} />
          <Customer draft={draft} />
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