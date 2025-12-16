import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { memo, useEffect, useState } from "react";
import { X } from "lucide-react";
import { TextError } from "~/components/TextError";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Spinner } from "~/components/Spinner";
import { useAction } from "~/hooks/use-action";
import { Form } from "react-router";
import { useLoading } from "~/hooks/use-loading";
import { Action } from "./action";
import { Method } from "~/database/method/get-all";

export const DeleteBtn = memo(function ({ method }: { method: Method }) {
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
      <Button type="button" asChild className="rounded-full p-2" variant="destructive">
        <DialogTrigger>
          <X className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-3xl">Hapus Catatan</DialogTitle>
          <Form method="POST" className="flex flex-col gap-2 text-3xl">
            <input type="hidden" name="action" value="delete"></input>
            <input type="hidden" name="id" value={method.id}></input>
            <DialogDescription>Hapus metode: {method.name}?</DialogDescription>
            <TextError>{error}</TextError>
            <div className="col-span-2 flex flex-col items-end">
              <Button variant="destructive">
                Hapus
                <Spinner when={loading} />
              </Button>
            </div>
          </Form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
});
