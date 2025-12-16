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
import { Form } from "react-router";
import { useLoading } from "~/hooks/use-loading";
import { Action } from "./action";
import { useAction } from "~/hooks/use-action";

export const NewCashier = memo(function () {
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
          Tambah Kasir <Plus />
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Tambah Kasir</DialogTitle>
        </DialogHeader>
        <Form method="POST">
          <input type="hidden" name="action" value="new"></input>
          <label className="grid grid-cols-[100px_1fr] text-normal items-center">
            <span>Nama:</span>
            <Input type="text" name="name" aria-autocomplete="list" />
          </label>
          <div className="flex justify-between mt-5">
            <Button asChild variant={"secondary"}>
              <DialogClose type="button">Batal</DialogClose>
            </Button>
            <Button>
              Tambahkan <Spinner when={loading} />
            </Button>
          </div>
        </Form>
        <TextError>{error}</TextError>
      </DialogContent>
    </Dialog>
  );
});
