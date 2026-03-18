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
import { useNew } from "./use-new";
import { Plus } from "lucide-react";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { useLocation } from "react-router";

export const NewPocket = memo(function NewItem() {
  const [open, setOpen] = useState(false);
  const { handleSubmit, loading, name, setName, error } = useNew(() => setOpen(false));
  const { pathname } = useLocation();
  const paths = pathname.split("/");
  if (paths.length !== 2) return null;
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button asChild>
        <DialogTrigger>
          <Plus />
          Kantong Baru
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
      </DialogContent>
    </Dialog>
  );
});
