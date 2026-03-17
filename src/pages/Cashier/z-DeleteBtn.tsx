import { X } from "lucide-react";
import { memo, useState } from "react";
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
import { useDelete } from "./use-delete";

export const DeleteBtn = memo(function DeleteBtn({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const { error, handleSubmit, loading } = useDelete(name, () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button className="rounded-full p-2" type="button" asChild variant="destructive">
        <DialogTrigger>
          <X />
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Yakin?</DialogTitle>
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
              <Spinner when={loading} />
            </Button>
          </form>
          <TextError>{error}</TextError>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
});
