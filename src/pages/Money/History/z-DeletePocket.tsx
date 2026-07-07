import { Button } from "~/components/ui/button";
import { useGetUrlBack } from "~/hooks/use-get-url-back";
import { useNavigate } from "react-router";
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
import { DialogClose } from "~/components/ui/dialog";

type Props = {
  pocketId: string;
  onDelete: (pocketId: string) => Promise<string | null>;
};

export function DeletePocket({ pocketId, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const { loading, error, handleDelete } = useDeletePocket(
    onDelete,
    pocketId,
    () => setOpen(false),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" asChild variant="destructive">
        <DialogTrigger>Hapus Kantong</DialogTrigger>
      </Button>
      <DialogContent className="max-w-4xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-big">Hapus Kantong</DialogTitle>
          <div className="flex flex-col gap-2">
            <p>
              Kamu akan menghapus kantong ini. Semua catatan keuangan pada
              kantong ini akan terhapus selamanya!
            </p>
            <TextError>{error}</TextError>
            <div className="flex items-center justify-between">
              <Button asChild variant="secondary">
                <DialogClose>Batalkan</DialogClose>
              </Button>
              <Button onClick={handleDelete} variant="destructive">
                Hapus
                <Spinner when={loading} />
              </Button>
            </div>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

function useDeletePocket(
  onDelete: (pocketId: string) => Promise<string | null>,
  pocketId: string,
  onClose: () => void,
) {
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const urlBack = useGetUrlBack("/money");
  const navigate = useNavigate();

  async function handleDelete() {
    setLoading(true);
    const errMsg = await onDelete(pocketId);
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      onClose();
      navigate(urlBack);
    }
  }

  return { loading, error, handleDelete };
}
