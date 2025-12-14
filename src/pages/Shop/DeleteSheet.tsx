import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { X } from "lucide-react";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { Form } from "react-router";
import { useAction } from "~/hooks/use-action";
import { Action } from "./action";
import { toast } from "sonner";

export function DeleteSheet({ tab }: { tab: number }) {
  const [open, setOpen] = useState(false);
  const error = useAction<Action>()("delete");
  useEffect(() => {
    if (error === undefined) return;
    toast.error(error);
  }, [error]);
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button asChild variant="ghost" className="p-0">
        <DialogTrigger>
          <X />
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Hapus Sesi</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-normal">
          Hapus sesi transaksi no {tab}?
        </DialogDescription>
        <DialogFooter>
          <Form method="POST">
            <input type="hidden" name="action" value="delete"></input>
            <input type="hidden" name="tab" value={tab}></input>
            <Button variant="destructive">Hapus</Button>
          </Form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
