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

export function DeleteBtn({ name, id }: { name: string; id: string }) {
  const { loading, handleDelete, error } = useDel(id);
  return (
    <Dialog>
      <Button asChild variant="destructive">
        <DialogTrigger>Hapus</DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Yakin?</DialogTitle>
          <DialogDescription>Kamu akan menghapus:</DialogDescription>
          <DialogDescription>
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
