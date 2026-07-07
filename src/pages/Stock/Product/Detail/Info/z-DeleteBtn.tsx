import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "~/components/ui/dialog";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";

type Props = {
  name: string;
  onDelete: () => Promise<string | null>;
};

export function DeleteBtn({ name, onDelete }: Props) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const errMsg = await onDelete();
    setLoading(false);
    setError(errMsg);
  }

  return (
    <Dialog>
      <Button asChild variant="destructive">
        <DialogTrigger>Hapus</DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-3xl">Yakin?</DialogTitle>
          <DialogDescription className="text-2xl">Kamu akan menghapus:</DialogDescription>
          <DialogDescription className="text-2xl">
            {">"}
            {name}
          </DialogDescription>
          <div className="flex justify-between mt-5">
            <Button asChild>
              <DialogClose>Batal</DialogClose>
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              Hapus
              <Spinner when={loading} />
            </Button>
          </div>
          <TextError>{error}</TextError>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
