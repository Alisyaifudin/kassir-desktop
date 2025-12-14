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
import { cn, sizeClass } from "~/lib/utils";
import { useAction } from "~/hooks/use-action";
import { Form } from "react-router";
import { Size } from "~/lib/store-old";
import { useLoading } from "~/hooks/use-loading";
import { Action } from "./action";
import { css } from "./style.css";

export const NewBtn = memo(function ({ size }: { size: Size }) {
  const [open, setOpen] = useState(false);
  const loading = useLoading();
  const error = useAction<Action>()("new");
  useEffect(() => {
    if (error === undefined && !loading) {
      setOpen(false);
    }
  }, [loading]);
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button asChild>
        <DialogTrigger>Tambah</DialogTrigger>
      </Button>
      <DialogContent className="max-w-4xl">
        <DialogHeader className={sizeClass[size]}>
          <DialogTitle className="text-big">Tambah Kontak</DialogTitle>
          <Form
            method="POST"
            className={cn("grid gap-2 items-center justify-end", css.newItem[size])}
          >
            <input type="hidden" name="action" value="new"></input>
            <Input name="name" placeholder="Nama Kontak" aria-autocomplete="list" />
            <Input name="value" placeholder="Isian Kontak" aria-autocomplete="list" />
            {error ? (
              <>
                <TextError>{error.name}</TextError>
                <TextError>{error.value}</TextError>
              </>
            ) : null}
            <div className="col-span-2 flex flex-col items-end">
              <TextError>{error?.global}</TextError>
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
