import { memo, useEffect, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/Spinner";
import { useLoading } from "~/hooks/use-loading";
import { useAction } from "~/hooks/use-action";
import { Action } from "./action";
import { Form } from "react-router";

export const NewCustomer = memo(function () {
  const [open, setOpen] = useState(false);
  const loading = useLoading();
  const error = useAction<Action>()("new");
  useEffect(() => {
    if (error === undefined && !loading) {
      setOpen(false);
    }
  }, [error, loading]);
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button asChild>
        <DialogTrigger>
          Tambah Pelanggan <Plus />
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-normal">Tambah Pelanggan</DialogTitle>
        </DialogHeader>
        <Form method="POST" className="flex flex-col gap-2">
          <input type="hidden" name="action" value="new"></input>
          <label className="grid grid-cols-[100px_1fr] items-center">
            <span className="text-normal">Nama:</span>
            <Input type="text" name="name" aria-autocomplete="list" />
          </label>
          <TextError>{error?.name}</TextError>
          <label className="grid grid-cols-[100px_1fr] items-center">
            <span className="text-normal">Hp:</span>
            <Input type="number" name="phone" aria-autocomplete="list" />
          </label>
          <TextError>{error?.phone}</TextError>
          <TextError>{error?.global}</TextError>
          <div className="flex justify-between mt-5">
            <Button type="button" asChild variant={"secondary"}>
              <DialogClose type="button">Batal</DialogClose>
            </Button>
            <Button>
              Tambahkan <Spinner when={loading} />
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
});
