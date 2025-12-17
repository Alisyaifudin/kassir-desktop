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
import { formatDate, formatTime, getDayName } from "~/lib/utils";
import { Form } from "react-router";
import { Spinner } from "~/components/Spinner";
import { useLoading } from "~/hooks/use-loading";
import { useAction } from "~/hooks/use-action";
import { Action } from "./action";
import { MoneyData } from "./loader";

export const DeleteBtn = memo(function ({ money }: { money: MoneyData["saving"][number] }) {
  const [open, setOpen] = useState(false);
  const loading = useLoading();
  const error = useAction<Action>()("delete");
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
          <Form method="POST" className="flex flex-col gap-2 text-3xl">
            <input type="hidden" name="action" value="delete"></input>
            <input type="hidden" name="timestamp" value={money.timestamp}></input>
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
            <TextError>{error}</TextError>
            <div className="col-span-2 flex flex-col items-end">
              <Button variant="destructive">
                Hapus
                <Spinner when={loading} />
              </Button>
            </div>
          </Form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
});
