import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { useState } from "react";
import { X } from "lucide-react";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { formatEpochtime, getDayName } from "~/lib/date";
import { Money } from "~/services/money/type";
import { useCallback } from "react";

type Props = {
  money: Money;
  onDelete: (id: string) => Promise<string | null>;
};

export function DeleteRecord({ money, onDelete }: Props) {
  const doDelete = useCallback(() => onDelete(money.id), [money.id, onDelete]);
  const [open, setOpen] = useState(false);
  const { loading, error, handleDelete } = useDeleteRecord(doDelete, () =>
    setOpen(false),
  );

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
      <DialogContent className="max-w-4xl" aria-describedby={undefined}>
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
}

function useDeleteRecord(
  onDelete: () => Promise<string | null>,
  onClose: () => void,
) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const errMsg = await onDelete();
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) onClose();
  }

  return { loading, error, handleDelete };
}
