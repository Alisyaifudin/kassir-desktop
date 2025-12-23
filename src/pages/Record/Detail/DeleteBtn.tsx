import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "~/components/ui/dialog";
import { useState } from "react";
import { TextError } from "~/components/TextError";
import { Form } from "react-router";
import { Spinner } from "~/components/Spinner";
import { useLoading } from "~/hooks/use-loading";
import { useAction } from "~/hooks/use-action";
import { Action } from "../action";

export function DeleteBtn({ timestamp }: { timestamp: number }) {
  const [open, setOpen] = useState(false);
  const loading = useLoading();
  const error = useAction<Action>()("delete");
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button asChild variant="destructive">
        <DialogTrigger>Hapus</DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Hapus catatan riwayat?</DialogTitle>
          <div className="flex justify-between mt-5">
            <Button asChild>
              <DialogClose>Batal</DialogClose>
            </Button>
            <Form method="POST">
              <input type="hidden" name="action" value="delete"></input>
              <input type="hidden" name="timestamp" value={timestamp}></input>
              <Button variant="destructive">
                Hapus <Spinner when={loading} />
              </Button>
            </Form>
          </div>
          <TextError>{error}</TextError>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
