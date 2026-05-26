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
import { useState } from "react";
import { Show } from "~/components/Show";
import { Spinner } from "~/components/Spinner";
import { useAdd } from "./use-add";
import { useId } from "../use-id";

export function ImageDialog() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const { loading, error, handleAdd, handleInput, reset, src } = useAdd(id, () => setOpen(false));
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          reset();
        }
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
            {(src) => (
              <div className="flex-1 flex items-center justify-center overflow-hidden">
                <img src={src} className="object-contain h-full" />
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
