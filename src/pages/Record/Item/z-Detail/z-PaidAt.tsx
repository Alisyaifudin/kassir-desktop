import { useMemo, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
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
import { Button } from "~/components/ui/button";
import { DateTime } from "~/components/DateTime";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { epochFromPlain, formatDate, formatTime, plainFromEpoch } from "~/lib/date";
import type { RecordFull } from "~/services/record";
import { useChangePaidAt } from "./use-change-paid-at";

/**
 * When the record was settled — the fact itself, with the control that corrects
 * it. Admin-only, like every date correction.
 *
 * The editor is the wheel picker rather than a day grid: a settlement has a
 * clock reading, and the grid could change the day while only carrying the old
 * time along. The pick is held by the dialog and written once on Simpan, so a
 * wheel step does not fire a record update (and a full re-read) per notch, and
 * Batal really does nothing. The wall is the moment the dialog opened: a
 * correction may move a payment earlier, never into the future — the same rule
 * `submit` applies to a fresh one.
 */
export function PaidAt({ record }: { record: RecordFull }) {
  const paidAt = record.paidAt;
  if (paidAt === null) return null;
  return <PaidAtEditor recordId={record.id} paidAt={paidAt} />;
}

function PaidAtEditor({ recordId, paidAt }: { recordId: string; paidAt: number }) {
  const { loading, error, change } = useChangePaidAt(recordId);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex shrink-0 flex-col items-end">
      <div className="flex items-center gap-1">
        <Spinner when={loading} />
        <Dialog open={open} onOpenChange={setOpen}>
          {/* The same ghost trigger the day-grid editor used: the label is the
              fact, the press is the correction. */}
          <Button asChild variant="ghost" className="flex w-fit items-center gap-2 outline small:w-fit">
            <DialogTrigger>
              <p className="text-small tabular-nums">
                Dibayar {formatTime(paidAt, "short")} · {formatDate(paidAt, "long")}
              </p>
              <CalendarDays className="icon" />
            </DialogTrigger>
          </Button>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-big">Waktu pembayaran</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              Pindahkan waktu catatan ini dibayar. Waktu setelah sekarang tidak bisa dipilih.
            </DialogDescription>
            <Picker
              initial={paidAt}
              loading={loading}
              error={error}
              onSave={async (epoch) => {
                const saved = await change(epoch);
                if (saved) setOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

/**
 * The dialog's draft. Radix mounts the content per open, so this state (and the
 * wall) is fresh every time the editor is opened, and closing without saving
 * leaves the record alone.
 */
function Picker({
  initial,
  loading,
  error,
  onSave,
}: {
  initial: number;
  loading: boolean;
  error: string | null;
  onSave: (epoch: number) => Promise<void>;
}) {
  const start = useMemo(() => plainFromEpoch(initial), [initial]);
  const [value, setValue] = useState(start);
  // Mount time is open time — the same rule as the cart's PaymentTime.
  const wall = useRef(plainFromEpoch(Date.now())).current;
  // A failure from a previous open must not greet the next one; only a save
  // attempted *here* shows its message.
  const [attempted, setAttempted] = useState(false);
  const dirty = !value.equals(start);

  return (
    <>
      <div className="flex justify-center py-2">
        <DateTime
          value={value}
          max={wall}
          className="border-none outline-none"
          onChange={setValue}
        />
      </div>
      {attempted ? <TextError>{error}</TextError> : null}
      <DialogFooter className="flex items-center justify-end gap-2">
        <DialogClose asChild>
          <Button type="button" variant="secondary" disabled={loading}>
            Batal
          </Button>
        </DialogClose>
        <Button
          type="button"
          disabled={loading || !dirty}
          onClick={() => {
            setAttempted(true);
            void onSave(epochFromPlain(value));
          }}
        >
          Simpan <Spinner when={loading} />
        </Button>
      </DialogFooter>
    </>
  );
}
