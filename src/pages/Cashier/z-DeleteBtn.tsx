import { X } from "lucide-react";
import { memo, useState } from "react";
import { Either } from "effect";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Spinner } from "~/components/Spinner";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";

export const DeleteBtn = memo(function DeleteBtn({ name, id }: { name: string; id: string }) {
  const [open, setOpen] = useState(false);
  const { error, pending, mutate } = useMutation(service.cashier.delete);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // The row wraps this dialog in its own form; a delete must not submit it.
    e.stopPropagation();
    const result = await mutate(id);
    if (Either.isRight(result)) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button className="rounded-full p-2" type="button" asChild variant="destructive">
        <DialogTrigger>
          <X />
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl">Yakin?</DialogTitle>
          <DialogDescription>Kamu akan menghapus:</DialogDescription>
          <DialogDescription>
            {">"}
            {name}
          </DialogDescription>
          <form onSubmit={handleSubmit} className="flex justify-between mt-5">
            <Button asChild>
              <DialogClose>Batal</DialogClose>
            </Button>
            <Button type="submit" variant="destructive">
              Hapus
              <Spinner when={pending} />
            </Button>
          </form>
          <TextError>{error?.message}</TextError>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
});
