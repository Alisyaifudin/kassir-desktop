import { useState } from "react";
import { Either } from "effect";
import { ArrowDown, ArrowUp, X } from "lucide-react";
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
import { cn } from "~/lib/utils";
import { service } from "~/services";
import type { ReportCategory } from "~/services/report";

/**
 * One category row: the name is the field, the arrows are the order, the cross is
 * the delete.
 *
 * Renaming in place is the whole editor, as it is on `/categories` — a category is
 * a name and nothing else. The **slug** does not move when the name does, which is
 * what lets `Beli` become `Pembelian` without every query having to learn the new
 * spelling.
 */
export function Item({
  category,
  first,
  last,
  onMoveUp,
  onMoveDown,
  busy,
}: {
  category: ReportCategory;
  first: boolean;
  last: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  busy: boolean;
}) {
  const [name, setName] = useState(category.name);
  const rename = useMutation((next: string) => service.report.set.category(category.id, next));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = name.trim();
    if (next === "" || next === category.name) {
      // Unchanged is not a write, and a blank name would leave a nameless row in
      // every picker.
      setName(category.name);
      return;
    }
    const result = await rename.mutate(next);
    if (Either.isLeft(result)) setName(category.name);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex w-full items-center gap-1 p-0.5">
        <form onSubmit={submit} className="flex w-full items-center gap-1">
          <Input
            className="w-full"
            aria-label={`Nama kategori ${category.name}`}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            onBlur={() => setName(category.name)}
          />
          <Spinner when={rename.pending} />
        </form>

        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold",
            category.builtin
              ? "bg-muted text-muted-foreground"
              : "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
          )}
          title={
            category.builtin
              ? "Kategori bawaan: boleh diganti namanya, tidak boleh dihapus."
              : "Kategori buatan sendiri."
          }
        >
          {category.builtin ? "bawaan" : "sendiri"}
        </span>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={`Naikkan ${category.name}`}
          disabled={first || busy}
          onClick={onMoveUp}
          className="size-8 shrink-0"
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={`Turunkan ${category.name}`}
          disabled={last || busy}
          onClick={onMoveDown}
          className="size-8 shrink-0"
        >
          <ArrowDown className="size-4" />
        </Button>

        {/* A built-in has no cross: the report reads `jual`, `beli` and `abaikan`
            by slug, so the button would only ever be refused. */}
        {category.builtin ? null : <Delete category={category} />}
      </div>
      <TextError>{rename.error?.message}</TextError>
    </div>
  );
}

function Delete({ category }: { category: ReportCategory }) {
  const [open, setOpen] = useState(false);
  const remove = useMutation(service.report.delete.category);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await remove.mutate(category.id);
    if (Either.isRight(result)) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" asChild className="shrink-0 rounded-full p-2" variant="destructive">
        <DialogTrigger aria-label={`Hapus ${category.name}`}>
          <X className="size-5" />
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Hapus Kategori</DialogTitle>
          <form onSubmit={submit} className="flex flex-col gap-2">
            <DialogDescription>Hapus kategori: {category.name}?</DialogDescription>
            <TextError>{remove.error?.message}</TextError>
            <div className="col-span-2 flex flex-col items-end">
              <Button disabled={remove.pending} variant="destructive">
                Hapus
                <Spinner when={remove.pending} />
              </Button>
            </div>
          </form>
        </DialogHeader>
        {/* The lines keep their money: the category is a label on them, and a past
            report has to keep being able to say what a line was. */}
        <DialogDescription>
          Laporan yang sudah ada tidak berubah. Kategori hanya dipakai untuk baris
          berikutnya.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
