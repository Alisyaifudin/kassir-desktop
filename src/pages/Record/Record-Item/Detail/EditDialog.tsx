import { memo, useCallback, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { SelectMethod } from "./SelectMethod";
import { SelectMode } from "./SelectMode";
import { Note } from "./Note";
import { ToCreditBtn } from "./ToCreditBtn";
import { Show } from "~/components/Show";
import { sizeClass } from "~/lib/utils";
import { Size } from "~/lib/store-old";
import { useLoading } from "~/hooks/use-loading";
import { Spinner } from "~/components/Spinner";
import { useAction } from "~/hooks/use-action";
import { Action } from "../action";
import { TextError } from "~/components/TextError";

export const EditDialog = memo(function ({
  method,
  methods,
  mode,
  note,
  isCredit,
  size,
}: {
  mode: DB.Mode;
  note: string;
  isCredit: boolean;
  method: DB.Method;
  methods: DB.Method[];
  size: Size;
}) {
  const [open, setOpen] = useState(false);
  const loading = useLoading();
  const error = useAction<Action>()("edit-note");
  const close = useCallback(() => {
    setOpen(false);
  }, []);
  useEffect(() => {
    if (error === undefined && !loading) {
      setOpen(false);
    }
  }, [loading, error]);
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button variant="outline" asChild className="w-fit">
        <DialogTrigger type="button">Edit</DialogTrigger>
      </Button>
      <DialogContent className={sizeClass[size]}>
        <DialogHeader>
          <DialogTitle className="text-5xl">Sunting catatan</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-5">
          <Show when={!isCredit}>
            <SelectMode close={close} mode={mode} />
          </Show>
          <SelectMethod method={method} methods={methods} close={close} />
          <Note close={close} note={note} />
          <TextError>{error}</TextError>
          <div className="flex items-center justify-between">
            <Show when={!isCredit && mode === "buy"} fallback={<div />}>
              <ToCreditBtn close={close} />
            </Show>
            <Button form="record-note">
              Simpan
              <Spinner when={loading} />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
