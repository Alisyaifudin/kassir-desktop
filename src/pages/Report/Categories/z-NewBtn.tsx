import { useState } from "react";
import { Either } from "effect";
import { useMutation } from "~/components/Loader";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { service } from "~/services";

/** The add dialog: one name, appended to the end of the order. */
export function NewBtn() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const add = useMutation((next: string) => service.report.add.category(next));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = name.trim();
    if (next === "") return;
    const result = await add.mutate(next);
    if (Either.isLeft(result)) return;
    setName("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button className="w-fit self-end" asChild>
        <DialogTrigger>Tambah</DialogTrigger>
      </Button>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Tambahkan Kategori</DialogTitle>
          <form onSubmit={submit} className="flex flex-col gap-2">
            <Input
              name="name"
              placeholder="Nama"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              aria-autocomplete="list"
            />
            <TextError>{add.error?.message}</TextError>
            <div className="col-span-2 flex flex-col items-end">
              <Button disabled={add.pending || name.trim() === ""}>
                Tambah
                <Spinner when={add.pending} />
              </Button>
            </div>
          </form>
        </DialogHeader>
        <DialogDescription>
          Arti sebuah baris, misalnya Penyesuaian, Tips, atau Bahan Bakar.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
