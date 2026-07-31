import { X } from "lucide-react";
import { memo, useState } from "react";
import { Block } from "~/components/block/block";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";

export const DeleteDialog = memo(function DeleteDialog({
  name,
  id,
  onDelete,
  isLoading,
}: {
  name: string;
  id: string;
  onDelete: (id: string) => Promise<string | null>;
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || isLoading) return;
    setLoading(true);
    const err = await onDelete(id);
    setLoading(false);
    setError(err);
    if (err === null) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button className="rounded-full p-2" type="button" asChild variant="destructive">
        <DialogTrigger disabled={loading || isLoading}>
          <X />
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Yakin?</DialogTitle>
          <DialogDescription>Kamu akan menghapus:</DialogDescription>
          <DialogDescription>&gt;{name}</DialogDescription>
          <Block  className="flex justify-between mt-5">
            <Button asChild>
              <DialogClose>Batal</DialogClose>
            </Button>
            <Button onClick={handleSubmit} variant="destructive">
              Hapus
              <Spinner when={loading} />
            </Button>
          </Block>
          <TextError>{error}</TextError>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
});