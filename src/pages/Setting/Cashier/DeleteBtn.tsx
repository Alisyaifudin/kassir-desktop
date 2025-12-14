import { X } from "lucide-react";
import { memo, useState } from "react";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Spinner } from "~/components/Spinner";
import { Form } from "react-router";
import { useLoading } from "~/hooks/use-loading";
import { useAction } from "~/hooks/use-action";
import { Action } from "./action";
import { Size } from "~/lib/store-old";
import { sizeClass } from "~/lib/utils";

export const DeleteBtn = memo(function ({ name, size }: { name: string; size: Size }) {
  const [open, setOpen] = useState(false);
  const loading = useLoading();
  const error = useAction<Action>()("delete");
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button className="rounded-full p-2" type="button" asChild variant="destructive">
        <DialogTrigger>
          <X />
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader className={sizeClass[size]}>
          <DialogTitle className="text-big">Yakin?</DialogTitle>
          <DialogDescription>Kamu akan menghapus:</DialogDescription>
          <DialogDescription>
            {">"}
            {name}
          </DialogDescription>
          <Form method="POST" className="flex justify-between mt-5">
            <input type="hidden" name="action" value="delete"></input>
            <input type="hidden" name="name" value={name}></input>
            <Button asChild>
              <DialogClose>Batal</DialogClose>
            </Button>
            <Button variant="destructive">
              Hapus
              <Spinner when={loading} />
            </Button>
          </Form>
          <TextError>{error}</TextError>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
});
