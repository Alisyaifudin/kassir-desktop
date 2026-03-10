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
import { useDel } from "./use-del";
import { useId } from "../../use-id";

export function DeleteBtn({ name }: { name: string }) {
  const id = useId();
  const { error, loading, handleDelete } = useDel(id);
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
