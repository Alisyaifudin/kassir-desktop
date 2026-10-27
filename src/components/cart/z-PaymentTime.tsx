import { useRef } from "react";
import { Checkbox } from "~/components/ui/checkbox";
import { DateTime } from "~/components/DateTime";
import { epochFromPlain, plainFromEpoch } from "~/lib/date";
import { service } from "~/services";
import type { Draft } from "~/services/transaction";
import { run } from "~/components/cart/run";
import { cn } from "~/lib/utils";

/**
 * When this record is settled. `saat ini` (checked, and the normal case) leaves
 * `paid_at` to `submit`; turning it off stores a picked time on the draft and
 * settles the record there instead. The pick lives on the draft
 * (`tx_record_paid_at`), not in this control, because `Bayar` is a different
 * panel — closing the dialog or collapsing the accordion must not lose it.
 *
 * The control is mounted only where it can be seen (the Pos dialog's content,
 * the purchase payment stage's accordion), so its mount moment is the moment the
 * operator opened it: that doubles as the picker's first reading *and* its
 * `max`, which is what makes a time backdatable but never post-dated. The commit
 * path clamps to `Date.now()` on top of that, since a screen may sit open.
 *
 * A credit record stores no `paid_at` at all, so the pick is ignored when the
 * purchase is settled as credit — the checkbox stays available because which
 * button is pressed later is not this control's to know.
 */
export function PaymentTime({ draft, className }: { draft: Draft; className?: string }) {
  // A fresh mount is a fresh open: the default reading and the wall are the same
  // instant, so the wheel starts on "now" and can only go backwards.
  const openedAt = useRef(Date.now());
  const id = `paid-now-${draft.id}`;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground select-none">Waktu pembayaran:</span>
        <Checkbox
          id={id}
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
        <label htmlFor={id} className="text-sm select-none">
          saat ini
        </label>
      </div>
      {draft.paidAt === null ? null : (
        <div className="flex w-full justify-center">
          <DateTime
            value={plainFromEpoch(draft.paidAt)}
            max={plainFromEpoch(openedAt.current)}
            className="border-none outline-none"
            onChange={(value) =>
              run(service.transaction.set.paidAt(draft.id, epochFromPlain(value)))
            }
          />
        </div>
      )}
    </div>
  );
}
