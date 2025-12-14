import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { memo, useEffect, useState } from "react";
import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/Spinner";
import { useLoading } from "~/hooks/use-loading";
import { Form } from "react-router";
import { useAction } from "~/hooks/use-action";
import { Action } from "./action";
import { Size } from "~/lib/store-old";
import { sizeClass } from "~/lib/utils";
import { useMethod } from "./use-method";

export const NewBtn = memo(function ({ size }: { size: Size }) {
  const [method] = useMethod();
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
      <Button className="w-fit self-end" asChild>
        <DialogTrigger>Tambah</DialogTrigger>
      </Button>
      <DialogContent className="max-w-xl">
        <DialogHeader className={sizeClass[size]}>
          <DialogTitle className="text-3xl">Tambahkan Jenis Pembayaran</DialogTitle>
          <Form method="POST" className="flex flex-col gap-2">
            <input type="hidden" name="action" value="new"></input>
            <input type="hidden" name="kind" value={method}></input>
            <Input name="name" placeholder="Nama" aria-autocomplete="list" />
            <TextError>{error}</TextError>
            <div className="col-span-2 flex flex-col items-end">
              <Button>
                Tambah
                <Spinner when={loading} />
              </Button>
            </div>
          </Form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
});
