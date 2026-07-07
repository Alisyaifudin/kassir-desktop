import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { useState } from "react";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { Plus } from "lucide-react";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import z from "zod";

// ============================================================
// Types
// ============================================================

type Props = {
  onAdd: (name: string) => Promise<string | null>;
};

// ============================================================
// Component
// ============================================================

export function NewPocket({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const { handleSubmit, loading, error } = useNew(onAdd, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button asChild>
        <DialogTrigger>
          <Plus />
          Kantong Baru
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-3xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-big">Tambah Kantong Keuangan Baru</DialogTitle>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <Field>
              <FieldLabel htmlFor="pocket-name">Nama</FieldLabel>
              <Input id="pocket-name" name="name" />
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
}

// ============================================================
// Hook
// ============================================================

export function useNew(
  onAdd: (name: string) => Promise<string | null>,
  onSuccess: () => void,
) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    const formdata = new FormData(e.currentTarget);
    const parsed = z
      .string()
      .trim()
      .nonempty("Tidak boleh kosong")
      .max(20, "Maksimal 20 karakter")
      .safeParse(formdata.get("name"));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Tidak boleh kosong");
      return;
    }
    const name = parsed.data;
    setLoading(true);
    const errMsg = await onAdd(name);
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) onSuccess();
  }

  return { error, loading, handleSubmit };
}
