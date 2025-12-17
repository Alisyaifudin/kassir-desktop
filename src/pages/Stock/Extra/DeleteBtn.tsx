import { Form } from "react-router";
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
import { useLoading } from "~/hooks/use-loading";
import { useAction } from "~/hooks/use-action";
import { Action } from "./action";

export function DeleteBtn({ name }: { name: string }) {
  const loading = useLoading();
  const error = useAction<Action>()("delete");
  return (
    <Dialog>
      <Button asChild variant="destructive">
        <DialogTrigger>Hapus</DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Yakin?</DialogTitle>
          <DialogDescription className="text-normal">Kamu akan menghapus:</DialogDescription>
          <DialogDescription className="text-normal">
            {">"}
            {name}
          </DialogDescription>
          <div className="flex justify-between mt-5">
            <Button asChild>
              <DialogClose>Batal</DialogClose>
            </Button>
            <Form method="POST">
              <input type="hidden" name="action" value="delete"></input>
              <Button variant="destructive">
                Hapus
                <Spinner when={loading} />
              </Button>
            </Form>
          </div>
          <TextError>{error}</TextError>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
