import { useState } from "react";
import { X } from "lucide-react";
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
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { ImageResult } from "~/services/image";

type Props = {
  selected: ImageResult;
  productId: string;
  onDelete: (productId: string, id: string) => Promise<string | null>;
};

export function DeleteImg({ selected, productId, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    const err = await onDelete(productId, selected.id);
    setLoading(false);
    setError(err);
    if (err === null) {
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
