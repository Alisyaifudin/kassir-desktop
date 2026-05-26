import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { memo, useState } from "react";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { useDeletePocket } from "./use-delete-pocket";
import { DialogClose } from "@radix-ui/react-dialog";

export const DeletePocketBtn = memo(function DeleteBtn({ kindId }: { kindId: string }) {
  const [open, setOpen] = useState(false);
  const { loading, error, handleDelete } = useDeletePocket(kindId, () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button type="button" asChild variant="destructive">
        <DialogTrigger>Hapus Kantong</DialogTrigger>
      </Button>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-3xl">Hapus Kantong</DialogTitle>
          <div className="flex flex-col gap-2 text-3xl">
            <p>
              Kamu akan menghapus kantong ini. Semua catatan keuangan pada kantong ini akan
              terhapus selamanya!
            </p>
            <TextError>{error}</TextError>

            <div className="col-span-2 flex items-center justify-between">
              <Button asChild variant="secondary">
                <DialogClose>Batalkan</DialogClose>
              </Button>
              <Button onClick={handleDelete} variant="destructive">
                Hapus
                <Spinner when={loading} />
              </Button>
            </div>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
});
