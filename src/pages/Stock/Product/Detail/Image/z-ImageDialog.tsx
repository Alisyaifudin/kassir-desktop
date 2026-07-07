import { useState } from "react";
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
import { Input } from "~/components/ui/input";
import { Show } from "~/components/Show";
import { Spinner } from "~/components/Spinner";
import { revalidate } from "./use-data";

type Props = {
  productId: string;
  onAdd: (productId: string, file: File) => Promise<string | null>;
};

export function ImageDialog({ productId, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [src, setSrc] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setSrc(null);
    if (src) URL.revokeObjectURL(src);
  }

  async function handleAdd() {
    if (file === null) return;
    setLoading(true);
    const err = await onAdd(productId, file);
    setLoading(false);
    setError(err);
    if (err === null) {
      reset();
      setOpen(false);
      revalidate();
    }
  }

  function handleInput(e: React.FormEvent<HTMLInputElement>) {
    const files = e.currentTarget.files;
    if (files === null || files.length === 0) {
      reset();
      return;
    }
    const f = files[0];
    setFile(f);
    setSrc(URL.createObjectURL(f));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) reset();
        setOpen(open);
      }}
    >
      <Button asChild className="text-small!">
        <DialogTrigger>Tambah Gambar</DialogTrigger>
      </Button>
      <DialogContent className="max-w-7xl max-h-[95vh] flex">
        <div className="flex-1 flex flex-col gap-2">
          <DialogHeader>
            <DialogTitle className="text-normal">Tambahkan Gambar</DialogTitle>
          </DialogHeader>
          <Show value={src}>
            {(s) => (
              <div className="flex-1 flex items-center justify-center overflow-hidden">
                <img src={s} className="object-contain h-full" />
              </div>
            )}
          </Show>
          <Input
            type="file"
            onInput={handleInput}
            accept="image/png, image/jpeg"
            aria-autocomplete="list"
          />
          <DialogFooter className="flex flex-col gap-1 w-full pt-5">
            <div className="flex justify-between w-full gap-2">
              <Button asChild variant="secondary">
                <DialogClose>Batal</DialogClose>
              </Button>
              <Button disabled={loading || src === null} onClick={handleAdd}>
                Tambah <Spinner when={loading} />
              </Button>
            </div>
          </DialogFooter>
          <TextError>{error}</TextError>
        </div>
      </DialogContent>
    </Dialog>
  );
}
