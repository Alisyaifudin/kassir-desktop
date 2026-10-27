import { useState } from "react";
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
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { useDelete } from "./use-delete";

/** The record is soft-deleted; its stock movement and day lists follow the service. */
export function DeleteBtn({ recordId }: { recordId: string }) {
  const [open, setOpen] = useState(false);
  const { error, loading, remove } = useDelete(recordId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button asChild variant="destructive">
        <DialogTrigger>Hapus</DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl">Hapus catatan riwayat?</DialogTitle>
          <div className="flex justify-between mt-5">
            <Button asChild>
              <DialogClose disabled={loading}>Batal</DialogClose>
            </Button>
            <Button onClick={() => void remove()} disabled={loading} variant="destructive">
              Hapus <Spinner when={loading} />
            </Button>
          </div>
          <TextError>{error}</TextError>
        </DialogHeader>
        <DialogDescription>Catatan riwayat ini beserta barisnya dihapus permanen.</DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
