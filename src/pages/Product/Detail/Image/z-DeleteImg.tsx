import { useState } from "react";
import { Effect } from "effect";
import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { useImageUrl } from "~/hooks/use-image";
import { image } from "~/lib/image";
import { service } from "~/services";
import type { GalleryItem } from "./use-gallery";

/**
 * Deletes a saved image: the row first, then its file. A draft is not in the db
 * and never reaches here - `DiscardDraft` drops it.
 */
export function DeleteImg({ productId, item }: { productId: string; item: GalleryItem }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saved = useImageUrl(item.draft === null ? item.file : null, item.draft === null ? item.mime : null);
  const href = item.draft !== null ? item.draft.href : saved;

  async function handleDelete() {
    setBusy(true);
    setError(null);
    const removed = await Effect.runPromise(
      service.product.set.image.remove(productId, item.id).pipe(Effect.either),
    );
    if (removed._tag === "Left") {
      setError(removed.left.message);
      setBusy(false);
      return;
    }
    const file = await Effect.runPromise(image.del(item.file).pipe(Effect.either));
    setBusy(false);
    if (file._tag === "Left") {
      setError(file.left.e.message);
      return;
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button asChild variant="destructive" className="absolute right-0 top-1 rounded-full p-1">
        <DialogTrigger>
          <X className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent className="flex max-h-[95vh] max-w-7xl">
        <div className="flex flex-1 flex-col">
          <DialogHeader>
            <DialogTitle className="text-normal">Hapus Gambar</DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 items-center justify-center overflow-hidden">
            {href !== null ? <img src={href} className="h-full object-contain" alt="" /> : null}
          </div>
          <div className="mt-5 flex justify-between">
            <Button asChild variant="secondary">
              <DialogClose>Batal</DialogClose>
            </Button>
            <Button type="button" onClick={handleDelete} variant="destructive">
              Hapus <Spinner when={busy} />
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
