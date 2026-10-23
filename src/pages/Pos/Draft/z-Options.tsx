import { useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
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
import { DateTime } from "~/components/DateTime";
import { epochFromPlain, plainFromEpoch } from "~/lib/date";
import { service } from "~/services";
import type { Draft } from "~/services/transaction";
import { run } from "~/components/cart/run";
import { Customer } from "./z-Customer";
import { Precision } from "~/components/cart/z-Precision";

/**
 * The sale's optional details — precision, customer, payment time, note — behind
 * one small button at the top of the grand-total panel, so they stay out of the
 * settle strip until the operator asks for them.
 *
 * "Waktu pembayaran" is the only one that changes what `Bayar` writes: `saat
 * ini` (the default, and the normal case) settles the record at commit time,
 * while turning it off stores a picked time on the draft and settles the sale
 * there instead. The pick itself lives on the draft (`tx_record_paid_at`), not
 * in this dialog, because `Bayar` is a different panel — closing the dialog must
 * not lose it.
 *
 * The picker's `max` is the moment the dialog was opened, so a sale can be
 * backdated but never post-dated. The commit path clamps to `Date.now()` on top
 * of that, since the dialog may sit open for a while.
 */
export function Options({ draft, onStore }: { draft: Draft; onStore: () => void }) {
  const [open, setOpen] = useState(false);
  // The request's "default to the time you open the dialog": the first time the
  // box is turned off, the wheel starts on the moment the dialog was opened.
  const openedAt = useRef(Date.now());
  const paidNowId = `paid-now-${draft.id}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) openedAt.current = Date.now();
        setOpen(next);
      }}
    >
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
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-small text-muted-foreground select-none">
                Waktu pembayaran:
              </span>
              <Checkbox
                id={paidNowId}
                checked={draft.paidAt === null}
                onCheckedChange={(checked) =>
                  run(
                    service.transaction.set.paidAt(
                      draft.id,
                      checked === true ? null : openedAt.current,
                    ),
                  )
                }
              />
              <label htmlFor={paidNowId} className="text-small select-none">
                saat ini
              </label>
            </div>
            {draft.paidAt === null ? null : (
              <div className="flex justify-center w-full ">
                <DateTime
                  value={plainFromEpoch(draft.paidAt)}
                  max={plainFromEpoch(openedAt.current)}
                  className="outline-none border-none"
                  onChange={(value) =>
                    run(service.transaction.set.paidAt(draft.id, epochFromPlain(value)))
                  }
                />
              </div>
            )}
          </div>
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
