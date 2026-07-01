import { TextError } from "~/components/TextError";
import { X } from "lucide-react";
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
import { Spinner } from "~/components/Spinner";

export function DeleteDialog({
  id,
  name,
  phone,
  onDelete,
}: {
  id: string;
  name: string;
  phone: string;
  onDelete: (id: string) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const err = await onDelete(id);
    setLoading(false);
    setError(err);
    if (err === null) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button className="p-2 rounded-full" type="button" asChild variant="destructive">
        <DialogTrigger>
          <X className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-normal">Yakin?</DialogTitle>
          <DialogDescription className="text-small">Kamu akan menghapus:</DialogDescription>
          <DialogDescription className="text-small">&gt; Nama: {name}</DialogDescription>
          <DialogDescription className="text-small">&gt; HP: {phone}</DialogDescription>
          <form onSubmit={handleSubmit} className="flex justify-between mt-5">
            <Button type="button" asChild>
              <DialogClose>Batal</DialogClose>
            </Button>
            <Button disabled={loading} variant="destructive">
              Hapus
              <Spinner when={loading} />
            </Button>
          </form>
          <TextError>{error}</TextError>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
