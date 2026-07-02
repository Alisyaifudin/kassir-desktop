import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { useCallback, useState } from "react";
import { X } from "lucide-react";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { formatEpochtime, getDayName } from "~/lib/date";
import { Money } from "~/services/money/type";
import { Effect } from "effect";
import { MoneyService } from "~/services/money";

export const deleteRecord = Effect.gen(function* () {
  const moneyService = yield* MoneyService;
  const onDeleteFunc = (id: string) => moneyService.money.delete(id);
  return function DeleteRecordBtn({ money }: { money: Money }) {
    const onDelete = useCallback(() => onDeleteFunc(money.id), [money.id]);
    const [open, setOpen] = useState(false);
    const { loading, error, handleDelete } = useDeleteRecord(onDelete, () => setOpen(false));
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          type="button"
          asChild
          className="rounded-full aspect-square p-1"
          variant="destructive"
        >
          <DialogTrigger>
            <X className="icon" />
          </DialogTrigger>
        </Button>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-big">Hapus Catatan</DialogTitle>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-[200px_1fr]">
                <p>Tanggal</p>
                <p>
                  : {getDayName(money.timestamp)},{" "}
                  {formatEpochtime(money.timestamp, { date: "long" })}
                </p>
              </div>
              <div className="grid grid-cols-[200px_1fr]">
                <p>Waktu</p>
                <p>: {formatEpochtime(money.timestamp, { time: "long" })}</p>
              </div>
              <div className="grid grid-cols-[200px_1fr]">
                <p>Nilai</p>
                <p>: Rp{money.value.toLocaleString("id-ID")}</p>
              </div>
              <div className="grid grid-cols-[200px_1fr]">
                <p>Catatan</p>
                <p>: {money.note}</p>
              </div>
              <TextError>{error}</TextError>
              <div className="flex flex-col items-end">
                <Button onClick={handleDelete} variant="destructive">
                  Hapus
                  <Spinner when={loading} />
                </Button>
              </div>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  };
});

export function useDeleteRecord(onDelete: () => Promise<string | null>, onClose: () => void) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  async function handleDelete() {
    setLoading(true);
    const errMsg = await onDelete();
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      onClose();
    }
  }
  return { loading, error, handleDelete };
}
