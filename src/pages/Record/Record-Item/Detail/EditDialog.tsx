import { memo, use, useCallback, useState } from "react";
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
import { DefaultError, Result } from "~/lib/utils";
import { useLoading } from "~/hooks/use-loading";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Method } from "~/database/method/get-all";

export const EditDialog = memo(function ({
  method,
  methods: promise,
  mode,
  note,
  isCredit,
}: {
  mode: DB.Mode;
  note: string;
  isCredit: boolean;
  method: Method;
  methods: Promise<Result<DefaultError, Method[]>>;
}) {
  const [errMsg, methods] = use(promise);
  if (errMsg !== null) {
    return <TextError>{errMsg}</TextError>;
  }
  return <Wrapper method={method} note={note} mode={mode} methods={methods} isCredit={isCredit} />;
});

function Wrapper({
  method,
  methods,
  mode,
  note,
  isCredit,
}: {
  mode: DB.Mode;
  note: string;
  isCredit: boolean;
  method: Method;
  methods: Method[];
}) {
  const [open, setOpen] = useState(false);
  const loading = useLoading();
  const close = useCallback(() => {
    setOpen(false);
  }, []);
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button variant="outline" asChild className="w-fit">
        <DialogTrigger type="button">Edit</DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-5xl">Sunting catatan</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-5">
          <Show when={!isCredit}>
            <SelectMode close={close} mode={mode} />
          </Show>
          <SelectMethod method={method} methods={methods} close={close} />
          <Note close={close} note={note} />
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
}
