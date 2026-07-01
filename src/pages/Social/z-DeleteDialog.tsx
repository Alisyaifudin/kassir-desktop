import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { useState } from "react";
import { X } from "lucide-react";
import { TextError } from "~/components/TextError";
import { cn } from "~/lib/utils";
import { Spinner } from "~/components/Spinner";

export function DeleteDialog({
  id,
  name,
  value,
  onDelete,
}: {
  id: string;
  name: string;
  value: string;
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
      <Button
        type="button"
        asChild
        className={cn("w-fit p-0 rounded-full", "p-1.5 small:p-1")}
        variant="destructive"
      >
        <DialogTrigger>
          <X className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-big">Hapus Kontak</DialogTitle>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className={cn("grid grid-cols-[200px_1fr] small:grid-cols-[150px_1fr]")}>
              <span>Jenis Kontak</span>
              <span>: {name}</span>
            </div>
            <div className={cn("grid grid-cols-[200px_1fr] small:grid-cols-[150px_1fr]")}>
              <span>Isian Kontak</span>
              <span>: {value}</span>
            </div>
            <TextError>{error}</TextError>
            <div className="col-span-2 flex flex-col items-end">
              <Button disabled={loading} variant="destructive" type="submit">
                Hapus
                <Spinner when={loading} />
              </Button>
            </div>
          </form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
