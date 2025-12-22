import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { memo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { TextError } from "~/components/TextError";
import { cn, sizeClass } from "~/lib/utils";
import { Form } from "react-router";
import { useAction } from "~/hooks/use-action";
import { Action } from "./action";
import { useLoading } from "~/hooks/use-loading";
import { css } from "./style.css";
import { useSize } from "~/hooks/use-size";

export const DeleteBtn = memo(function ({
  id,
  name,
  value,
}: {
  id: number;
  name: string;
  value: string;
}) {
  const size = useSize()
  const [open, setOpen] = useState(false);
  const error = useAction<Action>()("delete");
  const loading = useLoading();
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button
        type="button"
        asChild
        className={cn("w-fit p-0 rounded-full", css.delete[size].iconBtn)}
        variant="destructive"
      >
        <DialogTrigger>
          <X className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-4xl">
        <DialogHeader className={sizeClass[size]}>
          <DialogTitle className="text-big">Hapus Kontak</DialogTitle>
          <Form method="POST" className="flex flex-col gap-2">
            <input type="hidden" name="action" value="delete"></input>
            <input type="hidden" name="id" value={id}></input>
            <div className={cn("grid", css.delete[size].grid)}>
              <p>Nama</p>
              <p>: {name}</p>
            </div>
            <div className={cn("grid", css.delete[size].grid)}>
              <p>Isian</p>
              <p>: {value}</p>
            </div>
            {error ? <TextError>{error}</TextError> : null}
            <div className="col-span-2 flex flex-col items-end">
              <Button variant="destructive">
                Hapus
                {loading && <Loader2 className="animate-spin" />}
              </Button>
            </div>
          </Form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
});
