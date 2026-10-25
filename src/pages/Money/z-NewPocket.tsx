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
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { useNewPocket } from "./use-new";
import { Plus } from "lucide-react";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";

export const NewPocket = memo(function NewPocket() {
  const [open, setOpen] = useState(false);
  const { handleSubmit, loading, name, setName, error } = useNewPocket(() => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      {/* Floating action button: the page header keeps only the title, so the
          one primary action sits where the thumb already is. */}
      <Button
        asChild
        size="icon"
        className="fixed bottom-6 right-6 z-40 size-14 rounded-full shadow-lg shadow-primary/25 transition-transform hover:scale-105 active:scale-95 small:bottom-4 small:right-4 small:size-12"
      >
        <DialogTrigger aria-label="Tambah kantong baru">
          <Plus className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-big">Tambah Kantong Keuangan Baru</DialogTitle>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <Field>
              <FieldLabel htmlFor="pocket-name">Nama</FieldLabel>
              <Input
                id="pocket-name"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
              />
            </Field>
            <TextError>{error}</TextError>
            <div className="col-span-2 flex flex-col items-end">
              <Button>
                Tambah
                <Spinner when={loading} />
              </Button>
            </div>
          </form>
        </DialogHeader>
        <DialogDescription>Kantong baru untuk memisahkan uang tunai, bank, atau dompet digital.</DialogDescription>
      </DialogContent>
    </Dialog>
  );
});
