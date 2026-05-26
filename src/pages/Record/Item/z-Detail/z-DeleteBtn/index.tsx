import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "~/components/ui/dialog";
import { useState } from "react";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { useDelete } from "./use-delete";

export function DeleteBtn({ recordId }: { recordId: string }) {
  const [open, setOpen] = useState(false);
  const { error, handleDelete, loading } = useDelete({ recordId });
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button asChild variant="destructive">
        <DialogTrigger>Hapus</DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Hapus catatan riwayat?</DialogTitle>
          <div className="flex justify-between mt-5">
            <Button asChild>
              <DialogClose disabled={loading}>Batal</DialogClose>
            </Button>
            <Button onClick={handleDelete} disabled={loading} variant="destructive">
              Hapus <Spinner when={loading} />
            </Button>
          </div>
          <TextError>{error}</TextError>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
