import { X } from "lucide-react";
import { memo, useEffect, useState } from "react";
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
import { useLoading } from "~/hooks/use-loading";
import { Form } from "react-router";
import { useAction } from "~/hooks/use-action";
import { Action } from "./action";
import { Size } from "~/lib/store-old";
import { sizeClass } from "~/lib/utils";

export const DeleteBtn = memo(function ({
  name,
  phone,
  size,
}: {
  name: string;
  phone: string;
  size: Size;
}) {
  const [open, setOpen] = useState(false);
  const loading = useLoading();
  const error = useAction<Action>()("delete");
  useEffect(() => {
    if (error === undefined) {
      setOpen(false);
    }
  }, [error]);
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button className="p-2 rounded-full" type="button" asChild variant="destructive">
        <DialogTrigger>
          <X />
        </DialogTrigger>
      </Button>
      <DialogContent className={sizeClass[size]}>
        <DialogHeader>
          <DialogTitle className="text-3xl">Yakin?</DialogTitle>
          <DialogDescription className="text-small">Kamu akan menghapus:</DialogDescription>
          <DialogDescription className="text-small">
            {">"} Nama: {name}
          </DialogDescription>
          <DialogDescription className="text-small">
            {">"} HP: {phone}
          </DialogDescription>
          <Form method="POST" className="flex justify-between mt-5">
            <input type="hidden" name="action" value="delete"></input>
            <input type="hidden" name="phone" value={phone}></input>
            <Button type="button" asChild>
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
