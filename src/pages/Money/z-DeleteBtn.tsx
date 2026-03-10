import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { memo, useState } from "react";
import { X } from "lucide-react";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { MoneyData } from "./use-data";
import { formatDate, formatTime, getDayName } from "~/lib/date";
import { useDelete } from "./use-delete";

export const DeleteBtn = memo(function ({ money }: { money: MoneyData["saving"][number] }) {
  const [open, setOpen] = useState(false);
  const { loading, error, handleDelete } = useDelete(money.timestamp, () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
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
          <DialogTitle className="text-3xl">Hapus Catatan</DialogTitle>
          <div className="flex flex-col gap-2 text-3xl">
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
      </DialogContent>
    </Dialog>
  );
});
