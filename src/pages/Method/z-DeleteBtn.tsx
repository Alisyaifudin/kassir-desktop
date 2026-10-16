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

export const DeleteBtn = memo(function DeleteBtn({ name, id }: { name: string; id: string }) {
  const [open, setOpen] = useState(false);
  const { error, pending, mutate } = useMutation(service.method.delete.byId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // The row wraps this dialog in its own form; a delete must not submit it.
    e.stopPropagation();
    const result = await mutate(id);
    if (Either.isRight(result)) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button type="button" asChild className="rounded-full p-2" variant="destructive">
        <DialogTrigger>
          <X className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-big">Hapus Metode</DialogTitle>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <DialogDescription>Hapus metode: {name}?</DialogDescription>
            <TextError>{error?.message}</TextError>
            <div className="col-span-2 flex flex-col items-end">
              <Button disabled={pending} variant="destructive">
                Hapus
                <Spinner when={pending} />
              </Button>
            </div>
          </form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
});
