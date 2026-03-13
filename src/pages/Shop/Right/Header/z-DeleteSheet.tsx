import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { X } from "lucide-react";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useState } from "react";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { useDelete } from "./use-delete-tab";

export function DeleteSheet({ tab }: { tab: number }) {
  const [open, setOpen] = useState(false);
  const { loading, error, handleDelete } = useDelete(tab, () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button asChild variant="ghost" className="p-0">
        <DialogTrigger>
          <X />
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Hapus Sesi</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-normal">
          Hapus sesi transaksi no {tab}?
        </DialogDescription>
        <TextError>{error}</TextError>
        <DialogFooter>
          <Button onClick={handleDelete} variant="destructive">
            Hapus
            <Spinner when={loading} />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
