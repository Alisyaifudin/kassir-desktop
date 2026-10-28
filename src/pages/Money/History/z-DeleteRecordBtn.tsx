import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { memo, useState } from "react";
import { X } from "lucide-react";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { formatDate, formatTime, getDayName } from "~/lib/date";
import { useDeleteRecord } from "./use-delete-record";
import type { MoneyRow } from "./with-diff";

export const DeleteRecordBtn = memo(function DeleteRecordBtn({ money }: { money: MoneyRow }) {
  const [open, setOpen] = useState(false);
  const { loading, error, handleDelete } = useDeleteRecord(money.id, () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button
        type="button"
        size="icon"
        asChild
        className="rounded-full aspect-square p-1"
        variant="destructive"
      >
        <DialogTrigger>
          <X className="size-5" />
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Hapus Catatan</DialogTitle>
          <div className="flex flex-col gap-2 text-2xl">
            <div className="grid grid-cols-[200px_1fr]">
              <p>Tanggal</p>
              <p>
                : {getDayName(money.timestamp)}, {formatDate(money.timestamp, "long")}
              </p>
            </div>
            <div className="grid grid-cols-[200px_1fr]">
              <p>Waktu</p>
              <p>: {formatTime(money.timestamp, "long")}</p>
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
            <div className="col-span-2 flex flex-col items-end">
              <Button onClick={handleDelete} variant="destructive">
                Hapus
                <Spinner when={loading} />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <DialogDescription>Catatan ini dihapus dan saldo kantong dihitung ulang.</DialogDescription>
      </DialogContent>
    </Dialog>
  );
});
