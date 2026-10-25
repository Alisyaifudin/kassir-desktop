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

export const DeleteBtn = memo(function DeleteBtn({
  id,
  name,
  phone,
}: {
  id: string;
  name: string;
  phone: string;
}) {
  const [open, setOpen] = useState(false);
  const { error, pending, mutate } = useMutation(service.customer.delete.byId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // The row wraps this dialog in its own form; a delete must not submit it.
    e.stopPropagation();
    const result = await mutate(id);
    if (Either.isRight(result)) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button className="p-2 rounded-full" type="button" asChild variant="destructive">
        <DialogTrigger>
          <X className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-normal">Yakin?</DialogTitle>
          <DialogDescription className="text-small">Kamu akan menghapus:</DialogDescription>
          <DialogDescription className="text-small">
            {">"} Nama: {name}
          </DialogDescription>
          <DialogDescription className="text-small">
            {">"} HP: {phone}
          </DialogDescription>
          <form onSubmit={handleSubmit} className="flex justify-between mt-5">
            <Button type="button" asChild>
              <DialogClose>Batal</DialogClose>
            </Button>
            <Button disabled={pending} variant="destructive">
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
