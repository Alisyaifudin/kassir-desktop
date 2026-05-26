import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "~/components/ui/dialog";
import { X } from "lucide-react";
import { TextError } from "~/components/TextError";
import { useState } from "react";
import { Spinner } from "~/components/Spinner";
import { ImageResult } from "./use-data";
import { useDel } from "./use-del";

export function DeleteImg({ selected }: { selected: ImageResult }) {
  const [open, setOpen] = useState(false);
  const { loading, error, handleDelete } = useDel(selected.id, () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button asChild variant="destructive" className="rounded-full absolute top-1 right-0 p-1">
        <DialogTrigger>
          <X className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-7xl max-h-[95vh] flex">
        <div className="flex flex-1 flex-col">
          <DialogHeader>
            <DialogTitle className="text-normal">Hapus Gambar</DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 items-center justify-center overflow-hidden">
            <img src={selected.href} className="object-contain h-full" />
          </div>
          <div className="flex justify-between mt-5">
            <Button asChild variant="secondary">
              <DialogClose>Batal</DialogClose>
            </Button>
            <Button type="button" onClick={handleDelete} variant="destructive">
              Hapus <Spinner when={loading} />
            </Button>
          </div>
          <DialogFooter>
            <TextError>{error}</TextError>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
