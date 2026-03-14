import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { memo, useState } from "react";
import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/Spinner";
import { useNew } from "./use-new";

export const NewBtn = memo(function NewBtn() {
  const [open, setOpen] = useState(false);
  const { handleSubmit, error, loading, name } = useNew(() => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button className="w-fit self-end" asChild>
        <DialogTrigger>Tambah</DialogTrigger>
      </Button>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-3xl">Tambahkan Jenis Pembayaran</DialogTitle>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <Input
              name="name"
              placeholder="Nama"
              value={name.value}
              onChange={(e) => name.set(e.currentTarget.value)}
              aria-autocomplete="list"
            />
            <TextError>{error}</TextError>
            <div className="col-span-2 flex flex-col items-end">
              <Button disabled={loading}>
                Tambah
                <Spinner when={loading} />
              </Button>
            </div>
          </form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
});
