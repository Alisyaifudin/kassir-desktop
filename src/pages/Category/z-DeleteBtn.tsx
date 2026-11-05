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
import { Either } from "effect";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";
import { categoryMessage } from "./util-category";

export const DeleteBtn = memo(function DeleteBtn({ name, id }: { name: string; id: string }) {
  const [open, setOpen] = useState(false);
  const { error, pending, mutate } = useMutation(service.category.delete.byId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await mutate(id);
    if (Either.isRight(result)) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button type="button" asChild className="rounded-full p-2" variant="destructive">
        <DialogTrigger>
          <X className="size-5" />
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Hapus Kategori</DialogTitle>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <DialogDescription>Hapus kategori: {name}?</DialogDescription>
            <TextError>{categoryMessage(error)}</TextError>
            <div className="col-span-2 flex flex-col items-end">
              <Button disabled={pending} variant="destructive">
                Hapus
                <Spinner when={pending} />
              </Button>
            </div>
          </form>
        </DialogHeader>
        {/* The products stay: a category is a label on them, and deleting it only
            removes the label. */}
        <DialogDescription>Produk di dalamnya tidak dihapus.</DialogDescription>
      </DialogContent>
    </Dialog>
  );
});
